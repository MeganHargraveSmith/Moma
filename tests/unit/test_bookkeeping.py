import pytest
import os
from django.urls import reverse
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client as TestClient
from django.core.exceptions import ValidationError
from moma.models import Bookkeeping, CustomUser
from django.conf import settings

# Add MAX_UPLOAD_SIZE setting if not present
if not hasattr(settings, 'MAX_UPLOAD_SIZE'):
    settings.MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB

@pytest.mark.django_db
class TestBookkeeping:
    """
    Test suite for bookkeeping functionality.
    Tests expense entries, receipt management, and related operations.
    """
    
    def setup_method(self):
        """
        Initialise test client and test data before each test.
        """
        self.client = TestClient()
        # Create a test user
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            user_name='testuser',
            password='testpass123'
        )
        # Login the user
        self.client.force_login(self.user)
        
        self.valid_expense_data = {
            'document_number': 'INV-001',
            'business': 'Test Vendor',
            'invoice_date': timezone.now().date(),
            'payment_date': timezone.now().date(),
            'amount': '100.00'
        }
    
    def test_create_bookkeeping_record_api(self):
        """
        Test the bookkeeping record creation API endpoint.
        Verify that a new record can be created through the API.
        """
        response = self.client.post(
            reverse('create_bookkeeping_api'),
            data=self.valid_expense_data,
            content_type='application/json'
        )
        assert response.status_code == 200
        assert Bookkeeping.objects.filter(document_number='INV-001').exists()
    
    def test_update_bookkeeping_record_api(self):
        """
        Test the bookkeeping record update API endpoint.
        Verify that existing records can be updated through the API.
        """
        # Create initial record
        record = Bookkeeping.objects.create(
            user=self.user,
            **self.valid_expense_data
        )
        
        # Update data
        update_data = {
            'id': record.id,
            'document_number': 'INV-002',
            'amount': '200.00'
        }
        
        response = self.client.post(
            reverse('update_bookkeeping_api'),
            data=update_data,
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Verify update
        record.refresh_from_db()
        assert record.document_number == 'INV-002'
        assert str(record.amount) == '200.00'
    
    def test_upload_bookkeeping_document_api(self):
        """
        Test the document upload API endpoint.
        Verify that documents can be uploaded through the API.
        """
        # Create test file
        test_file = SimpleUploadedFile(
            "test_receipt.pdf",
            b"file_content",
            content_type="application/pdf"
        )
        
        # Create initial record
        record = Bookkeeping.objects.create(
            user=self.user,
            **self.valid_expense_data
        )
        
        # Upload document
        response = self.client.post(
            reverse('upload_bookkeeping_document_api'),
            data={
                'id': record.id,
                'document': test_file
            },
            format='multipart'
        )
        assert response.status_code == 200
        
        # Verify upload
        record.refresh_from_db()
        assert record.document.name.startswith(f'user_{self.user.id}/bookkeeping/test_receipt')
        assert record.document.name.endswith('.pdf')
    
    def test_file_conversion(self):
        """
        Test automatic file conversion to PDF.
        Verify that uploaded files are converted to PDF format.
        """
        # Create a larger test image (at least 100x100 pixels)
        image_data = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0C\x14\r\x0C\x0B\x0B\x0C\x19\x12\x13\x0F\x14\x1D\x1A\x1F\x1E\x1D\x1A\x1C\x1C $.' \",#\x1C\x1C(7),01444\x1F'9=82<.342\xFF\xDB\x00C\x01\t\t\t\x0C\x0B\x0C\x18\r\r\x182!\x1C!22222222222222222222222222222222222222222222222222\xFF\xC0\x00\x11\x08\x00d\x00d\x03\x01\"\x00\x02\x11\x01\x03\x11\x01\xFF\xC4\x00\x15\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xFF\xC4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xFF\xC4\x00\x14\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xFF\xC4\x00\x14\x11\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xFF\xDA\x00\x0C\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xB2\xFF\xD9"
        
        test_files = {
            'pdf': SimpleUploadedFile(
                "test_doc.pdf",
                b"%PDF-1.4\n%Test PDF content",
                content_type="application/pdf"
            ),
            'jpg': SimpleUploadedFile(
                "test_image.jpg",
                image_data,
                content_type="image/jpeg"
            )
        }
        
        for file_type, test_file in test_files.items():
            # Create record and upload file
            record = Bookkeeping.objects.create(
                user=self.user,
                **self.valid_expense_data
            )
            record.document = test_file
            record.original_filename = test_file.name
            record.save()
            
            # Verify conversion
            assert record.converted_pdf.name.startswith('converted_pdfs/')
            assert record.converted_pdf.name.endswith('.pdf')
    
    def test_invalid_file_types(self):
        """
        Test validation of file types.
        Verify that invalid file types are rejected.
        """
        # Create invalid test file
        invalid_file = SimpleUploadedFile(
            "test.exe",
            b"file_content",
            content_type="application/x-msdownload"
        )
        
        # Create record
        record = Bookkeeping.objects.create(
            user=self.user,
            **self.valid_expense_data
        )
        
        # Attempt upload
        with pytest.raises(ValidationError):
            record.document = invalid_file
            record.original_filename = invalid_file.name
            record.save()
    
    def test_file_size_validation(self):
        """
        Test file size validation.
        Verify that files exceeding size limits are rejected.
        """
        # Create large test file
        large_file = SimpleUploadedFile(
            "large_file.pdf",
            b"x" * (settings.MAX_UPLOAD_SIZE + 1),
            content_type="application/pdf"
        )
        
        # Create record
        record = Bookkeeping.objects.create(
            user=self.user,
            **self.valid_expense_data
        )
        
        # Attempt upload
        with pytest.raises(ValidationError) as exc_info:
            record.document = large_file
            record.original_filename = large_file.name
            record.full_clean()  # This will trigger the validation
            record.save()
        assert "File size exceeds maximum allowed size" in str(exc_info.value)
    
    def test_delete_bookkeeping_records_api(self):
        """
        Test the bookkeeping records deletion API endpoint.
        Verify that multiple records can be deleted through the API.
        """
        # Create multiple records
        records = []
        for i in range(3):
            record = Bookkeeping.objects.create(
                user=self.user,
                document_number=f'INV-{i}',
                business=f'Vendor {i}',
                invoice_date=timezone.now().date(),
                payment_date=timezone.now().date(),
                amount='100.00'
            )
            records.append(record)
        
        # Delete records
        record_ids = [record.id for record in records]
        response = self.client.post(
            reverse('delete_bookkeeping_records_api'),
            data={'record_ids': record_ids},
            content_type='application/json'
        )
        assert response.status_code == 200
        assert response.json()['success'] is True
        
        # Verify records are deleted
        for record in records:
            assert not Bookkeeping.objects.filter(id=record.id).exists()
    
    def test_expense_amount_validation(self):
        """
        Test expense amount validation.
        Verify that amount validation rules are enforced.
        """
        # Test valid amount
        valid_expense = Bookkeeping(
            user=self.user,
            document_number='INV-001',
            business='Test Vendor',
            invoice_date=timezone.now().date(),
            payment_date=timezone.now().date(),
            amount=100.00
        )
        valid_expense.full_clean()  # Should not raise ValidationError
        
        # Test invalid amount (negative)
        invalid_expense = Bookkeeping(
            user=self.user,
            document_number='INV-002',
            business='Test Vendor',
            invoice_date=timezone.now().date(),
            payment_date=timezone.now().date(),
            amount=-100.00
        )
        with pytest.raises(ValidationError):
            invalid_expense.full_clean()
        
        # Test invalid amount (too large)
        invalid_expense = Bookkeeping(
            user=self.user,
            document_number='INV-003',
            business='Test Vendor',
            invoice_date=timezone.now().date(),
            payment_date=timezone.now().date(),
            amount=1000001.00
        )
        with pytest.raises(ValidationError):
            invalid_expense.full_clean() 