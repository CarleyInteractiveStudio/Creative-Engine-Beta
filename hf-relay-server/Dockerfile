# Use Node.js as the base image
FROM node:18

# Create and set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port used by the relay server (matching server.js and HF default)
EXPOSE 7860

# Command to run the application
CMD ["node", "server.js"]
