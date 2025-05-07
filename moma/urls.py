from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.contrib.auth.views import LogoutView
from django.conf import settings
from django.conf.urls.static import static
from . import views


"""
URL configuration for Moma.
Maps URL patterns to views for authentication, dashboard, and API endpoints.
"""

urlpatterns = [
    path("auth/", include("djoser.urls")),
    path("auth/", include("djoser.urls.jwt")),
    path("admin/", admin.site.urls),

    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("", lambda request: redirect("login") if not request.user.is_authenticated else redirect("dashboard"), name="home"),

    path("dashboard/", views.dashboard_view, name="dashboard"),
    path("clients/", views.clients_view, name="clients"),
    path("bookkeeping/", views.bookkeeping, name="bookkeeping"),

    path('api/business_name/', views.get_business_name, name='get_business_name'),

    path("api/manage_clients/", views.manage_clients, name="manage_clients_api"),
    path('api/update_client/', views.update_client, name='update_client'),
    path("api/active_clients/", views.get_active_clients, name="active_clients_api"),
    path('clients/<int:client_id>/update_status/', views.update_client_status, name='update_client_status'),
    path('api/get_client_details/<int:client_id>/', views.get_client_details, name='get_client_details'),
    path('api/delete_marked_clients/', views.delete_marked_clients, name='delete_marked_clients_api'),
    path('api/clients/<int:client_id>/', views.update_client_details, name='update_client_details_api'),
    path('api/clients/', views.create_client, name='create_client_api'),

    path("api/create_task/", views.create_task_view, name="create_task_api"),
    path("api/create_project/", views.create_project_view, name="create_project_api"),
    path('api/update_task/', views.update_task, name='update_task_api'),
    path('api/update_project/', views.update_project, name='update_project_api'),
    path('api/update_subtask/', views.update_subtask, name='update_subtask_api'),
    path('update_task_status/', views.update_task_status, name='update_task_status'),
    path('update_project_status/', views.update_project_status, name='update_project_status'),
    path('update_subtask_status/', views.update_subtask_status, name='update_subtask_status'),

    path('api/create_bookkeeping/', views.create_bookkeeping_record, name='create_bookkeeping_api'),
    path('api/update_bookkeeping/', views.update_bookkeeping_record, name='update_bookkeeping_api'),
    path('api/upload_bookkeeping_document/', views.upload_bookkeeping_document, name='upload_bookkeeping_document_api'),
    path('api/delete_bookkeeping_records/', views.delete_bookkeeping_records, name='delete_bookkeeping_records_api')
    ] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)