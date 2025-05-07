from django.shortcuts import redirect
from django.urls import reverse
from django.conf import settings

class ForceLoginMiddleware:
    """
    Middleware to enforce login for all pages except signup and login.
    Redirect unauthenticated users to the login page.
    """
    def __init__(self, get_response):
        """
        Initialises the middleware with the response callable.
        """
        self.get_response = get_response

    def __call__(self, request):
        """
        Processes the request and redirects unauthenticated users.
        """
        exempt_urls = [
            reverse('signup'),
            reverse('login'),
        ]

        if not request.user.is_authenticated:
            if request.path not in exempt_urls:
                return redirect(reverse('login'))

        response = self.get_response(request)
        
        # Ensure secure session cookie settings
        if hasattr(response, 'cookies'):
            if 'sessionid' in response.cookies:
                response.cookies['sessionid']['secure'] = True
                response.cookies['sessionid']['httponly'] = True
                response.cookies['sessionid']['samesite'] = 'Lax'
        
        return response