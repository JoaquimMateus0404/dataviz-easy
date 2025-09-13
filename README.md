# DataViz Easy

Transform your CSV and Excel files into beautiful, interactive dashboards automatically.

## Features

- **Easy Upload**: Drag and drop CSV or Excel files for instant processing
- **Smart Data Analysis**: Automatic column type detection and data validation
- **AI-Powered Chart Suggestions**: Get intelligent chart recommendations based on your data
- **Interactive Charts**: Create bar charts, line charts, pie charts, scatter plots, and area charts
- **Chart Customization**: Customize chart types, columns, and titles
- **Export Functionality**: Export charts as PNG, JPEG, or PDF
- **Secure Data Storage**: User authentication with Supabase and Row Level Security
- **Responsive Design**: Modern SaaS-style interface that works on all devices

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS v4
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Processing**: Custom CSV parser with type detection
- **Export**: html2canvas, jsPDF

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase project (automatically configured in v0)

### Installation

1. The project is ready to run in v0 with all dependencies pre-installed
2. Database schema is automatically created when you run the SQL script
3. Supabase integration is pre-configured with environment variables

### Usage

1. **Upload Data**: Drag and drop your CSV or Excel file on the homepage
2. **View Analysis**: The system automatically analyzes your data and detects column types
3. **Explore Suggestions**: Review AI-generated chart suggestions based on your data
4. **Customize Charts**: Use the chart customizer to modify chart types and columns
5. **Create Visualizations**: Generate interactive charts with your data
6. **Export Charts**: Download your charts as PNG, JPEG, or PDF files

## Database Schema

The app uses the following tables:

- `uploaded_files`: Stores file metadata and processing status
- `data_columns`: Stores column information and detected types
- `data_rows`: Stores the actual processed data
- `charts`: Stores saved chart configurations

All tables are protected with Row Level Security (RLS) policies.

## API Endpoints

- `POST /api/process-file`: Processes uploaded files and stores data
- `GET /api/analyze-data`: Analyzes data and generates chart suggestions
- `POST /api/get-chart-data`: Retrieves formatted data for chart rendering

## Chart Types Supported

- **Bar Charts**: Compare categorical data
- **Line Charts**: Show trends over time
- **Pie Charts**: Display proportions and distributions
- **Scatter Plots**: Explore relationships between numeric variables
- **Area Charts**: Visualize trends with filled areas

## Data Processing Features

- **Automatic Type Detection**: Detects numbers, dates, strings, and booleans
- **CSV Parsing**: Handles quoted fields and special characters
- **Data Validation**: Filters out empty rows and validates data integrity
- **Smart Aggregation**: Groups and aggregates data for optimal visualization
- **Performance Optimization**: Limits data points for smooth chart rendering

## Security

- User authentication required for all operations
- Row Level Security (RLS) ensures users only access their own data
- Secure file processing with validation and sanitization
- Environment variables for sensitive configuration

## Contributing

This project was built with v0 and follows modern React and Next.js best practices. The codebase is modular and well-documented for easy maintenance and extension.
