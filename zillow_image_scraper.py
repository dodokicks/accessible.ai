#!/usr/bin/env python3
"""
Zillow Image Scraper

A Python script to scrape all image URLs from Zillow property listing pages.
Extracts images from embedded JSON data and optionally downloads them.

Usage:
    python zillow_image_scraper.py "<listing_url>"
    python zillow_image_scraper.py "<listing_url>" --download

Author: AI Assistant
"""

import requests
import json
import re
import os
import sys
import argparse
import boto3
import uuid
from datetime import datetime
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from botocore.exceptions import ClientError, NoCredentialsError


def get_headers():
    """
    Return headers to mimic a normal browser request.
    
    Returns:
        dict: Headers dictionary with User-Agent and Accept-Language
    """
    import random
    
    # Multiple realistic user agents to rotate
    user_agents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ]
    
    return {
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    }


def fetch_page_content(url):
    """
    Fetch the content of a Zillow listing page.
    
    Args:
        url (str): The Zillow listing URL
        
    Returns:
        str: Page content as HTML string, or None if request fails
    """
    try:
        print(f"Fetching page: {url}")
        
        # Create a session to maintain cookies
        session = requests.Session()
        
        # First, try to get the main page
        response = session.get(url, headers=get_headers(), timeout=30)
        
        # If we get a 403, try with a different approach
        if response.status_code == 403:
            print("Got 403, trying with different headers...")
            # Add more realistic headers
            headers = get_headers()
            headers.update({
                'Referer': 'https://www.zillow.com/',
                'Origin': 'https://www.zillow.com'
            })
            response = session.get(url, headers=headers, timeout=30)
        
        response.raise_for_status()
        return response.text
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching page: {e}")
        print("This might be due to Zillow's anti-bot protection.")
        print("Try using a VPN or different network if the issue persists.")
        return None


def extract_json_from_page(html_content):
    """
    Extract JSON data containing image information from the page HTML.
    
    Args:
        html_content (str): HTML content of the page
        
    Returns:
        dict: Parsed JSON data, or None if not found
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Method 1: Look for script tags with application/json type
        script_tags = soup.find_all('script', type='application/json')
        for script in script_tags:
            try:
                json_data = json.loads(script.string)
                if 'photoGallery' in json_data or 'images' in json_data:
                    return json_data
            except (json.JSONDecodeError, AttributeError):
                continue
        
        # Method 2: Look for all script tags and search for JSON patterns
        script_tags = soup.find_all('script')
        for script in script_tags:
            if script.string:
                script_content = script.string
                
                # Look for various JSON patterns that might contain image data
                patterns = [
                    r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
                    r'window\.__APP_STATE__\s*=\s*({.*?});',
                    r'window\.__PRELOADED_STATE__\s*=\s*({.*?});',
                    r'window\.__APOLLO_STATE__\s*=\s*({.*?});',
                    r'"photoGallery":\s*(\[.*?\])',
                    r'"images":\s*(\[.*?\])',
                    r'"photos":\s*(\[.*?\])',
                    r'"media":\s*(\[.*?\])'
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, script_content, re.DOTALL)
                    for match in matches:
                        try:
                            if match.startswith('{'):
                                json_data = json.loads(match)
                                if 'photoGallery' in json_data or 'images' in json_data or 'photos' in json_data:
                                    return json_data
                            elif match.startswith('['):
                                # It's an array, wrap it in an object
                                json_data = json.loads(match)
                                if isinstance(json_data, list) and len(json_data) > 0:
                                    # Check if it looks like image data
                                    if any(isinstance(item, dict) and ('url' in item or 'href' in item or 'src' in item) for item in json_data):
                                        return {'images': json_data}
                        except json.JSONDecodeError:
                            continue
        
        # Method 3: Look for any JSON that might contain image URLs
        all_scripts = soup.find_all('script')
        for script in all_scripts:
            if script.string and ('photo' in script.string.lower() or 'image' in script.string.lower()):
                # Try to find any JSON structure
                json_matches = re.findall(r'\{[^{}]*(?:"url"|"href"|"src"|"photo"|"image")[^{}]*\}', script.string)
                for match in json_matches:
                    try:
                        json_data = json.loads(match)
                        if any(key in json_data for key in ['url', 'href', 'src', 'photo', 'image']):
                            return json_data
                    except json.JSONDecodeError:
                        continue
        
        return None
        
    except Exception as e:
        print(f"Error extracting JSON from page: {e}")
        return None


def extract_image_urls(json_data):
    """
    Extract image URLs from JSON data.
    
    Args:
        json_data (dict): Parsed JSON data from the page
        
    Returns:
        list: List of image URLs
    """
    image_urls = []
    
    def search_for_images(data, path=""):
        """Recursively search for image URLs in nested JSON data."""
        if isinstance(data, dict):
            for key, value in data.items():
                if key.lower() in ['photoGallery', 'images', 'photos', 'pictures']:
                    if isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict):
                                # Look for common image URL fields
                                for url_field in ['url', 'href', 'src', 'imageUrl', 'photoUrl']:
                                    if url_field in item and item[url_field]:
                                        image_urls.append(item[url_field])
                                # Also check nested structures
                                search_for_images(item, f"{path}.{key}")
                    elif isinstance(value, str) and is_image_url(value):
                        image_urls.append(value)
                else:
                    search_for_images(value, f"{path}.{key}")
        elif isinstance(data, list):
            for i, item in enumerate(data):
                search_for_images(item, f"{path}[{i}]")
        elif isinstance(data, str) and is_image_url(data):
            image_urls.append(data)
    
    search_for_images(json_data)
    return list(set(image_urls))  # Remove duplicates


def is_image_url(url):
    """
    Check if a URL points to an image.
    
    Args:
        url (str): URL to check
        
    Returns:
        bool: True if URL appears to be an image
    """
    if not url or not isinstance(url, str):
        return False
    
    # Check for common image extensions
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff']
    url_lower = url.lower()
    
    # Check file extension
    for ext in image_extensions:
        if ext in url_lower:
            return True
    
    # Check for common image hosting patterns
    image_patterns = [
        r'\.(jpg|jpeg|png|gif|webp|bmp|tiff)',
        r'zillow.*\.(jpg|jpeg|png|gif|webp)',
        r'photos.*\.(jpg|jpeg|png|gif|webp)',
        r'images.*\.(jpg|jpeg|png|gif|webp)'
    ]
    
    for pattern in image_patterns:
        if re.search(pattern, url_lower):
            return True
    
    return False


def download_image(url, folder_path, filename):
    """
    Download an image from URL to the specified folder.
    
    Args:
        url (str): Image URL
        folder_path (str): Path to download folder
        filename (str): Filename for the downloaded image
        
    Returns:
        bool: True if download successful, False otherwise
    """
    try:
        response = requests.get(url, headers=get_headers(), timeout=30)
        response.raise_for_status()
        
        file_path = os.path.join(folder_path, filename)
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        print(f"Downloaded: {filename}")
        return True
        
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False


def get_s3_client():
    """
    Initialize and return S3 client.
    
    Returns:
        boto3.client: S3 client or None if credentials not available
    """
    try:
        s3_client = boto3.client('s3')
        # Test credentials by listing buckets
        s3_client.list_buckets()
        return s3_client
    except NoCredentialsError:
        print("AWS credentials not found. Please configure AWS credentials.")
        return None
    except ClientError as e:
        print(f"Error accessing S3: {e}")
        return None


def upload_to_s3(s3_client, image_data, bucket_name, s3_key):
    """
    Upload image data to S3.
    
    Args:
        s3_client: S3 client
        image_data (bytes): Image data
        bucket_name (str): S3 bucket name
        s3_key (str): S3 object key
        
    Returns:
        bool: True if upload successful, False otherwise
    """
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=image_data,
            ContentType='image/jpeg' if s3_key.endswith('.jpg') else 'image/webp'
        )
        return True
    except ClientError as e:
        print(f"Error uploading to S3: {e}")
        return False


def download_and_upload_to_s3(image_urls, listing_id, bucket_name=None):
    """
    Download images and upload them to S3.
    
    Args:
        image_urls (list): List of image URLs
        listing_id (str): Unique identifier for the listing
        bucket_name (str): S3 bucket name
        
    Returns:
        dict: Results with success count and S3 URLs
    """
    if not image_urls:
        return {"success": 0, "total": 0, "s3_urls": []}
    
    # Initialize S3 client
    s3_client = get_s3_client()
    if not s3_client:
        print("S3 not available, falling back to local download...")
        return download_all_images(image_urls, f"zillow_images_{listing_id}")
    
    # Use default bucket if not specified
    if not bucket_name:
        bucket_name = os.getenv('S3_BUCKET_NAME', 'zillow-images')
    
    print(f"\nDownloading {len(image_urls)} images and uploading to S3...")
    
    uploaded_count = 0
    s3_urls = []
    
    for i, url in enumerate(image_urls, 1):
        try:
            print(f"Processing image {i}/{len(image_urls)}: {url}")
            
            # Download image
            response = requests.get(url, headers=get_headers(), timeout=30)
            response.raise_for_status()
            
            # Extract filename from URL
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            
            if not filename or '.' not in filename:
                filename = f"image_{i:03d}.jpg"
            
            # Create S3 key with listing folder
            s3_key = f"listings/{listing_id}/{filename}"
            
            # Upload to S3
            if upload_to_s3(s3_client, response.content, bucket_name, s3_key):
                s3_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
                s3_urls.append(s3_url)
                uploaded_count += 1
                print(f"✓ Uploaded: {filename}")
            else:
                print(f"✗ Failed to upload: {filename}")
                
        except Exception as e:
            print(f"✗ Error processing {url}: {e}")
    
    print(f"\nUploaded {uploaded_count} out of {len(image_urls)} images to S3.")
    
    return {
        "success": uploaded_count,
        "total": len(image_urls),
        "s3_urls": s3_urls,
        "bucket": bucket_name,
        "listing_id": listing_id
    }


def download_all_images(image_urls, folder_name="zillow_images"):
    """
    Download all images to a specified folder.
    
    Args:
        image_urls (list): List of image URLs
        folder_name (str): Name of the folder to save images
        
    Returns:
        int: Number of successfully downloaded images
    """
    if not image_urls:
        print("No images to download.")
        return 0
    
    # Create folder if it doesn't exist
    os.makedirs(folder_name, exist_ok=True)
    
    print(f"\nDownloading {len(image_urls)} images to '{folder_name}/' folder...")
    
    downloaded_count = 0
    for i, url in enumerate(image_urls, 1):
        # Extract filename from URL or create one
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        
        if not filename or '.' not in filename:
            # Create filename if none exists
            filename = f"image_{i:03d}.jpg"
        
        # Ensure unique filename
        base_name, ext = os.path.splitext(filename)
        counter = 1
        original_filename = filename
        while os.path.exists(os.path.join(folder_name, filename)):
            filename = f"{base_name}_{counter}{ext}"
            counter += 1
        
        if download_image(url, folder_name, filename):
            downloaded_count += 1
    
    print(f"\nDownloaded {downloaded_count} out of {len(image_urls)} images.")
    return downloaded_count


def extract_images_from_html(html_content):
    """
    Extract image URLs directly from HTML content as a fallback method.
    
    Args:
        html_content (str): HTML content of the page
        
    Returns:
        list: List of image URLs found in HTML
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        image_urls = []
        
        # Look for img tags with various attributes
        img_tags = soup.find_all('img')
        for img in img_tags:
            # Check multiple possible source attributes
            src_attrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-srcset']
            for attr in src_attrs:
                src = img.get(attr)
                if src and is_image_url(src):
                    # Convert relative URLs to absolute
                    if src.startswith('//'):
                        src = 'https:' + src
                    elif src.startswith('/'):
                        src = 'https://www.zillow.com' + src
                    image_urls.append(src)
                    break  # Only add one source per img tag
        
        # Look for picture tags
        picture_tags = soup.find_all('picture')
        for picture in picture_tags:
            sources = picture.find_all('source')
            for source in sources:
                srcset = source.get('srcset')
                if srcset:
                    # Extract URLs from srcset (format: "url1 1x, url2 2x")
                    urls = re.findall(r'([^\s,]+)', srcset)
                    for url in urls:
                        if is_image_url(url):
                            if url.startswith('//'):
                                url = 'https:' + url
                            elif url.startswith('/'):
                                url = 'https://www.zillow.com' + url
                            image_urls.append(url)
        
        # Look for background images in style attributes
        elements_with_bg = soup.find_all(attrs={'style': re.compile(r'background-image')})
        for element in elements_with_bg:
            style = element.get('style', '')
            bg_match = re.search(r'background-image:\s*url\(["\']?([^"\']+)["\']?\)', style)
            if bg_match:
                url = bg_match.group(1)
                if is_image_url(url):
                    if url.startswith('//'):
                        url = 'https:' + url
                    elif url.startswith('/'):
                        url = 'https://www.zillow.com' + url
                    image_urls.append(url)
        
        # Look for image URLs in data attributes and JavaScript
        all_elements = soup.find_all(attrs={'data-src': True})
        for element in all_elements:
            data_src = element.get('data-src')
            if data_src and is_image_url(data_src):
                if data_src.startswith('//'):
                    data_src = 'https:' + data_src
                elif data_src.startswith('/'):
                    data_src = 'https://www.zillow.com' + data_src
                image_urls.append(data_src)
        
        # Search for Zillow photo URLs in the raw HTML content
        zillow_photo_pattern = r'https://photos\.zillowstatic\.com/fp/([a-f0-9]{32})-cc_ft_\d+\.(jpg|webp|png)'
        found_matches = re.findall(zillow_photo_pattern, html_content)
        for match in found_matches:
            base_id, extension = match
            # Try to get the highest resolution version
            full_url = f"https://photos.zillowstatic.com/fp/{base_id}-cc_ft_1536.{extension}"
            image_urls.append(full_url)
        
        # Remove duplicates and filter to get only unique images (highest resolution)
        unique_images = filter_unique_images(image_urls)
        return unique_images
        
    except Exception as e:
        print(f"Error extracting images from HTML: {e}")
        return []


def filter_unique_images(image_urls):
    """
    Filter image URLs to get only unique images, keeping the highest resolution version.
    
    Args:
        image_urls (list): List of all image URLs
        
    Returns:
        list: List of unique image URLs (highest resolution only)
    """
    try:
        # Group images by their base identifier (before the resolution suffix)
        image_groups = {}
        
        for url in image_urls:
            # Extract the base identifier from Zillow URLs
            # Example: https://photos.zillowstatic.com/fp/abc123-cc_ft_768.jpg -> abc123
            base_match = re.search(r'/([a-f0-9]{32})-cc_ft_\d+\.(jpg|webp|png)', url)
            if base_match:
                base_id = base_match.group(1)
                if base_id not in image_groups:
                    image_groups[base_id] = []
                image_groups[base_id].append(url)
            else:
                # For non-Zillow URLs, treat each as unique
                image_groups[url] = [url]
        
        # For each group, select the highest resolution image
        unique_images = []
        for base_id, urls in image_groups.items():
            if len(urls) == 1:
                # Single image, use it
                unique_images.append(urls[0])
            else:
                # Multiple resolutions, find the highest
                best_url = select_highest_resolution(urls)
                unique_images.append(best_url)
        
        return unique_images
        
    except Exception as e:
        print(f"Error filtering unique images: {e}")
        return list(set(image_urls))  # Fallback to simple deduplication


def select_highest_resolution(urls):
    """
    Select the highest resolution image from a list of URLs.
    
    Args:
        urls (list): List of image URLs with different resolutions
        
    Returns:
        str: URL of the highest resolution image
    """
    try:
        # Extract resolution numbers from URLs
        url_resolutions = []
        for url in urls:
            # Look for resolution pattern like -cc_ft_768.jpg
            res_match = re.search(r'-cc_ft_(\d+)\.', url)
            if res_match:
                resolution = int(res_match.group(1))
                url_resolutions.append((resolution, url))
            else:
                # If no resolution found, assume it's a base image
                url_resolutions.append((0, url))
        
        # Sort by resolution (descending) and return the highest
        url_resolutions.sort(key=lambda x: x[0], reverse=True)
        return url_resolutions[0][1]
        
    except Exception as e:
        print(f"Error selecting highest resolution: {e}")
        return urls[0]  # Fallback to first URL


def print_image_urls(image_urls):
    """
    Print image URLs in a clean list format.
    
    Args:
        image_urls (list): List of image URLs
    """
    if not image_urls:
        print("No images found on this listing.")
        return
    
    print(f"\nFound {len(image_urls)} image(s):")
    print("-" * 50)
    for i, url in enumerate(image_urls, 1):
        print(f"{i:2d}. {url}")
    print("-" * 50)


def main():
    """
    Main function to handle command-line arguments and orchestrate the scraping process.
    """
    parser = argparse.ArgumentParser(
        description="Scrape image URLs from Zillow property listings",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python zillow_image_scraper.py "https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/"
    python zillow_image_scraper.py "https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/" --download
        """
    )
    
    parser.add_argument(
        'url',
        help='Zillow property listing URL'
    )
    parser.add_argument(
        '--download',
        action='store_true',
        help='Download all images to zillow_images/ folder'
    )
    parser.add_argument(
        '--s3',
        action='store_true',
        help='Upload images to S3 bucket'
    )
    parser.add_argument(
        '--bucket',
        help='S3 bucket name (default: zillow-images)'
    )
    parser.add_argument(
        '--folder',
        default='zillow_images',
        help='Folder name for downloaded images (default: zillow_images)'
    )
    
    args = parser.parse_args()
    
    # Validate URL
    if not args.url.startswith('https://www.zillow.com/'):
        print("Error: Please provide a valid Zillow listing URL.")
        print("Example: https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/")
        sys.exit(1)
    
    print("Zillow Image Scraper")
    print("=" * 50)
    
    # Fetch page content
    html_content = fetch_page_content(args.url)
    if not html_content:
        print("Failed to fetch the page. Please check the URL and try again.")
        sys.exit(1)
    
    # Extract JSON data
    print("Extracting image data from page...")
    json_data = extract_json_from_page(html_content)
    
    image_urls = []
    if json_data:
        # Extract image URLs from JSON
        print("Parsing image URLs from JSON...")
        image_urls = extract_image_urls(json_data)
    
    # If no images found in JSON, try extracting from HTML directly
    if not image_urls:
        print("No images found in JSON, trying to extract from HTML...")
        image_urls = extract_images_from_html(html_content)
    else:
        # Filter JSON results to get unique images only
        print("Filtering JSON results to get unique images...")
        image_urls = filter_unique_images(image_urls)
    
    # Print results
    print_image_urls(image_urls)
    
    # Generate unique listing ID from URL
    listing_id = generate_listing_id(args.url)
    
    # Download/upload images if requested
    if args.s3 and image_urls:
        result = download_and_upload_to_s3(image_urls, listing_id, args.bucket)
        print(f"\nS3 Upload Results:")
        print(f"Successfully uploaded: {result['success']}/{result['total']} images")
        print(f"Bucket: {result['bucket']}")
        print(f"Listing ID: {result['listing_id']}")
        if result['s3_urls']:
            print(f"S3 URLs:")
            for i, url in enumerate(result['s3_urls'], 1):
                print(f"  {i}. {url}")
    elif args.download and image_urls:
        download_all_images(image_urls, args.folder)
    elif (args.download or args.s3) and not image_urls:
        print("No images to download/upload.")
    
    print("\nScraping completed!")


def generate_listing_id(url):
    """
    Generate a unique listing ID from the Zillow URL.
    
    Args:
        url (str): Zillow listing URL
        
    Returns:
        str: Unique listing identifier
    """
    # Extract ZPID from URL
    zpid_match = re.search(r'/(\d+)_zpid/', url)
    if zpid_match:
        return f"zpid_{zpid_match.group(1)}"
    
    # Fallback to hash of URL
    return f"listing_{hash(url) % 1000000:06d}"


if __name__ == "__main__":
    main()
