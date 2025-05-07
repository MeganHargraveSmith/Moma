from django.apps import AppConfig

class MomaConfig(AppConfig):
    """
    Configuration for the Moma application.
    Set default auto field and application name.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'moma'