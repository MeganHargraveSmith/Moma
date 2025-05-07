import pytest
import time
from django.urls import reverse
from django.utils import timezone
from moma.models import Task, Project, Client as ClientModel, CustomUser
from django.test import Client as TestClient
from django.db import connection, reset_queries
from django.conf import settings
import psutil
import os
import logging

@pytest.mark.django_db
class TestPerformance:
    """
    Test suite for performance-related functionality.
    Tests database query optimization, caching, API response times,
    memory usage, and concurrent operations.
    """
    
    def setup_method(self):
        """
        Initialise test client and test data before each test.
        """
        # Disable Django debug logging
        logging.disable(logging.CRITICAL)
        
        self.client = TestClient()
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            user_name='testuser',
            password='testpass123'
        )
        self.client.force_login(self.user)
        
        # Create test data
        self.test_client = ClientModel.objects.create(
            user=self.user,
            name='Test Client',
            email='client@example.com'
        )
        
        # Create multiple tasks and projects
        for i in range(100):
            Task.objects.create(
                user=self.user,
                client=self.test_client,
                name=f'Task {i}',
                priority='high' if i % 3 == 0 else 'medium' if i % 3 == 1 else 'low',
                status='not_started'
            )
            Project.objects.create(
                user=self.user,
                client=self.test_client,
                name=f'Project {i}',
                priority='high' if i % 3 == 0 else 'medium' if i % 3 == 1 else 'low',
                status='not_started'
            )
    
    def test_caching_mechanisms(self):
        """
        Test caching mechanisms.
        Verify that caching improves response times.
        """
        # First request (cache miss)
        start_time = time.time()
        response = self.client.get(reverse('dashboard'))
        first_request_time = time.time() - start_time
        
        # Second request (should be cached)
        start_time = time.time()
        response = self.client.get(reverse('dashboard'))
        second_request_time = time.time() - start_time
        
        # Cached request should be significantly faster
        assert second_request_time < first_request_time * 0.8
    
    def test_api_response_times(self):
        """
        Test API response times under different loads.
        Verify that API endpoints respond within acceptable time limits.
        """
        endpoints = [
            ('create_task_api', 'POST'),
            ('create_project_api', 'POST'),
            ('create_client_api', 'POST'),
            ('active_clients_api', 'GET')
        ]
        
        for endpoint, method in endpoints:
            start_time = time.time()
            if method == 'POST':
                response = self.client.post(reverse(endpoint), data={})
            else:
                response = self.client.get(reverse(endpoint))
            response_time = time.time() - start_time
            
            assert response.status_code in [200, 201, 403]  # API should respond with appropriate status
            assert response_time < 1.0  # API should respond within 1 second

    
    def test_memory_usage(self):
        """
        Test memory usage patterns.
        Verify that memory usage remains within acceptable limits.
        """
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Perform memory-intensive operations
        for _ in range(1000):
            self.client.get(reverse('dashboard'))
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable
        assert memory_increase < 50 * 1024 * 1024  # Less than 50MB increase
    
    def test_concurrent_operations(self):
        """
        Test concurrent user operations.
        Verify that the system handles concurrent requests properly.
        """
        import threading
        
        def make_requests():
            client = TestClient()
            client.force_login(self.user)
            for _ in range(10):
                client.get(reverse('dashboard'))
                client.get(reverse('clients'))
        
        # Create multiple threads
        threads = [threading.Thread(target=make_requests) for _ in range(10)]
        
        # Start all threads
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        total_time = time.time() - start_time
        
        # All concurrent operations should complete within reasonable time
        assert total_time < 5.0  # Should complete within 5 seconds
    
    def test_large_dataset_performance(self):
        """
        Test performance with large datasets.
        Verify that the system handles large amounts of data efficiently.
        """
        # Create large dataset
        large_client = ClientModel.objects.create(
            user=self.user,
            name='Large Client',
            email='large@example.com'
        )
        
        # Create 1000 tasks
        tasks = [
            Task(
                user=self.user,
                client=large_client,
                name=f'Task {i}',
                priority='high' if i % 3 == 0 else 'medium' if i % 3 == 1 else 'low',
                status='not_started'
            )
            for i in range(1000)
        ]
        Task.objects.bulk_create(tasks)
        
        # Test performance of dashboard with many tasks
        start_time = time.time()
        response = self.client.get(reverse('dashboard'))
        response_time = time.time() - start_time
        
        assert response.status_code == 200
        assert response_time < 2.0  # Should handle 1000 tasks within 2 seconds
    
    def test_search_performance(self):
        """
        Test search functionality performance.
        Verify that search operations are efficient.
        """
        # Test search with different query lengths
        query_lengths = [1, 5, 10, 20]
        
        for length in query_lengths:
            query = 'a' * length
            start_time = time.time()
            response = self.client.get(reverse('dashboard'), {'query': query})
            response_time = time.time() - start_time
            
            assert response.status_code == 200
            assert response_time < 0.5  # Search should be fast regardless of query length 