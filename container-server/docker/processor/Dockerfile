# 1. Use a minimal Python image
FROM python:3.11-alpine

# 2. Create a non-root user for security
RUN adduser -D -u 10000 processor

# 3. Install system dependencies (for pandas)
RUN apk add --no-cache gcc musl-dev libffi-dev

# 4. Copy and install Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy processor script
COPY process.py .
RUN chmod +x process.py

# 6. Switch to the non-root user
USER processor

# 7. Default workdir
WORKDIR /app

# 8. Entrypoint: runs the script
ENTRYPOINT ["./process.py"]
