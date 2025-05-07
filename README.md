# Moma: A Project Management Web Application for Professional Freelancers
By Megan Hargrave-Smith / Student 22003455
UWE Year 3 Digital Systems Project

## Overview

Moma is a web application designed specifically for professional freelancers to manage their work and clients effectively. It aims to provide a user-friendly interface that allows freelancers to track their work, manage clients, and streamline their workflow without the complexities and unnecessary features often found in traditional project management software.

### Key Features

- **Task Management**: Create, edit, and delete tasks with attributes such as priority, due date, and associated clients.
- **Project Management**: Organise tasks into projects consisting of subtasks, allowing for better management of larger goals.
- **Client Management**: Maintain a list of clients with relevant details and associated tasks.
- **Bookkeeping**: Track expenses and manage financial records, including document uploads for receipts and invoices, which will be useful for calculating taxes and business expenses.

## Installation

## Installation

To set up the project locally, follow these steps:

1. **Set Up a Virtual Environment**:
   Navigate to the project directory in your terminal and create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On macOS/Linux
   # OR
   venv\Scripts\activate  # On Windows
   ```

2. **Install Dependencies**:
   - Ensure you have the `requirements.txt` file in the project directory.
   - Install the required packages using pip:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set Up the Database**:
   - Run the following commands to create the database and apply migrations:
   ```bash
   python manage.py migrate
   ```

4. **Run the Development Server**:
   ```bash
   python manage.py runserver
   ```

6. **Access the Application**:
   Open your web browser and navigate to `http://127.0.0.1:8000/`.

## Usage

1. **Sign Up / Log In**:
   - If you are a new user, click on the "Sign Up" link to create an account.
   - If you already have an account, log in using your credentials.

2. **Navigating the Application**:
   - **Dashboard**: Create, view, and manage tasks and projects.
   - **Clients**: Create, view, and manage clients.
   - **Bookkeeping**: Track your financial records and upload documents.
   - Use the sidebar for quick navigation between different sections of the application.

3. **Creating Tasks and Projects**:
   - Click on the "+" button in the dashboard or on the sidebar to create new to-do's.

5. **Managing Clients**:
   - Navigate to the Clients section to add new clients or edit existing ones.
   - You can associate tasks with clients on the dashboard for better tracking and filtering.

6. **Bookkeeping**:
   - Use the Bookkeeping section to log expenses and upload relevant documents.