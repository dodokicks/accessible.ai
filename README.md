# Zillow Image Scraper

A comprehensive Python application that scrapes property images from Zillow listings and stores them in organized S3 buckets. Features both a command-line interface and a modern web application.

## 🚀 Features

### Core Functionality
- ✅ **Smart Image Extraction** - Finds all unique property images from Zillow listings
- ✅ **S3 Integration** - Automatically uploads images to organized S3 folders
- ✅ **Web Interface** - Modern, responsive web application
- ✅ **High-Quality Images** - Downloads highest resolution available (1536px)
- ✅ **Duplicate Filtering** - Removes duplicate images across different resolutions
- ✅ **Error Handling** - Graceful handling of network issues and missing data

### Web Application Features
- 🎨 **Modern UI** - Bootstrap-based responsive design
- 📱 **Mobile Friendly** - Works on all device sizes
- 🖼️ **Image Gallery** - Beautiful gallery view with modal lightbox
- 📋 **Copy URLs** - Easy copying of S3 URLs to clipboard
- ⬇️ **Bulk Download** - Download all images at once
- 📊 **Statistics** - View image counts and processing status

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Frontend  │────│   Flask API      │────│   S3 Storage    │
│   (HTML/JS)     │    │   (Python)      │    │   (AWS)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Zillow Scraper  │
                       │  (Core Logic)    │
                       └──────────────────┘
```

## 📦 Installation

### Prerequisites
- Python 3.9+
- AWS Account with S3 access
- AWS credentials configured

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd housingA
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure AWS credentials**
```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

4. **Set up environment variables**
```bash
cp env.example .env
# Edit .env with your configuration
```

## 🚀 Usage

### Web Application

1. **Start the web server**
```bash
python app.py
```

2. **Open your browser**
```
http://localhost:5000
```

3. **Enter a Zillow URL and click "Extract Images"**

### Command Line Interface

#### Basic Usage (List Image URLs)
```bash
python zillow_image_scraper.py "https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/"
```

#### Upload to S3
```bash
python zillow_image_scraper.py "https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/" --s3
```

#### Download Locally
```bash
python zillow_image_scraper.py "https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/" --download
```

#### Custom S3 Bucket
```bash
python zillow_image_scraper.py "https://www.zillow.com/homedetails/123-Main-St-San-Jose-CA-95112/123456_zpid/" --s3 --bucket my-custom-bucket
```

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Build and start the application
docker-compose up --build

# Run in background
docker-compose up -d
```

### Using Docker
```bash
# Build the image
docker build -t zillow-scraper .

# Run the container
docker run -p 5000:5000 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e S3_BUCKET_NAME=your-bucket \
  zillow-scraper
```

## 📁 S3 Organization

Images are stored in S3 with the following structure:
```
your-bucket/
├── listings/
│   ├── zpid_123456/
│   │   ├── image_001.jpg
│   │   ├── image_002.webp
│   │   └── ...
│   ├── zpid_789012/
│   │   ├── image_001.jpg
│   │   └── ...
│   └── ...
```

## 🔧 Configuration

### Environment Variables
- `AWS_ACCESS_KEY_ID` - Your AWS access key
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret key
- `AWS_DEFAULT_REGION` - AWS region (default: us-east-1)
- `S3_BUCKET_NAME` - S3 bucket name (default: zillow-images)
- `FLASK_ENV` - Flask environment (development/production)
- `SECRET_KEY` - Flask secret key for sessions
- `PORT` - Server port (default: 5000)

### S3 Bucket Setup
1. Create an S3 bucket in your AWS account
2. Configure bucket permissions for your application
3. Set the bucket name in your environment variables

## 🛠️ API Endpoints

### Web Endpoints
- `GET /` - Main application page
- `GET /gallery/<job_id>` - View image gallery
- `GET /status/<job_id>` - Check processing status
- `GET /results/<job_id>` - Get detailed results

### API Endpoints
- `POST /process` - Process a Zillow URL
  ```json
  {
    "url": "https://www.zillow.com/homedetails/..."
  }
  ```

## 🔍 How It Works

1. **URL Validation** - Ensures the URL is a valid Zillow listing
2. **Page Fetching** - Downloads the listing page with browser-like headers
3. **Image Discovery** - Multiple methods to find images:
   - JSON data extraction
   - HTML parsing
   - Pattern matching
4. **Deduplication** - Removes duplicate images across resolutions
5. **S3 Upload** - Organizes and uploads images to S3
6. **Results** - Returns organized image URLs and metadata

## 🚨 Error Handling

The application handles various error conditions:
- Invalid Zillow URLs
- Network connectivity issues
- Missing AWS credentials
- S3 upload failures
- Malformed image data
- Rate limiting

## 📊 Performance

- **Processing Time**: Typically 10-30 seconds per listing
- **Image Quality**: 1536px resolution (highest available)
- **Storage**: Organized by listing ID in S3
- **Scalability**: Handles multiple concurrent requests

## 🔒 Security

- AWS IAM credentials for S3 access
- Input validation for URLs
- Error message sanitization
- Rate limiting protection

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the error messages in the web interface
2. Review the command-line output for detailed error information
3. Ensure AWS credentials are properly configured
4. Verify S3 bucket permissions