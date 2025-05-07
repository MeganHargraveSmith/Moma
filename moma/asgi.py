import os
from django.core.asgi import get_asgi_application

"""
ASGI configuration for Moma.
Sets the default settings module and creates the ASGI app.
"""

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'moma.settings')
application = get_asgi_application()