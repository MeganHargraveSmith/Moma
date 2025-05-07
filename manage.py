import os
import sys

# Main function that sets the Django settings module and executes command line utilities.
def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moma.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

# Executes the main function when the script runs directly.
if __name__ == '__main__':
    main()