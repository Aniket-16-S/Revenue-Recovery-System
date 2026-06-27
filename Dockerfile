# Use an official Python slim runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required for WeasyPrint and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libpangocairo-1.0-0 \
    libglib2.0-0 \
    shared-mime-info \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . /app/

# Ensure necessary output folders exist
RUN mkdir -p /app/notices /app/temp

# Copy the entrypoint script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Expose port 8000 for the FastAPI backend
EXPOSE 8000

# Set entrypoint to run data generation before starting the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
