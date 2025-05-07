import os
from django.core.wsgi import get_wsgi_application

"""
WSGI configuration for Moma.
Sets the default settings module and creates the WSGI application.
"""

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moma.settings')
application = get_wsgi_application()