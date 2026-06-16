FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directory with permissions
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 7860

CMD ["python", "app.py"]
