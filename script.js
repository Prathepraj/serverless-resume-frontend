// 1. ***CRITICAL: REPLACE THIS PLACEHOLDER WITH YOUR API GATEWAY INVOKE URL***
// Example: const API_BASE_URL = 'https://a1b2c3d4e5.execute-api.eu-north-1.amazonaws.com/prod';
const API_BASE_URL = 'https://YOUR_API_GATEWAY_ID.execute-api.REGION.amazonaws.com/prod';

// --- NEW FUNCTION: Load data from DynamoDB to pre-fill the form ---
async function loadProfileData() {
    try {
        // Calls the new GET /profile endpoint
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            console.error("Failed to load profile. Starting with empty form.");
            return;
        }

        const data = await response.json();
        
        // If data exists, populate the form elements
        if (data.UserID) {
            const form = document.getElementById("resumeForm");
            
            // Populate the form fields dynamically based on DynamoDB keys
            form.elements['name'].value = data.name || '';
            form.elements['email'].value = data.email || '';
            form.elements['phone'].value = data.phone || '';
            form.elements['location'].value = data.location || '';
            form.elements['skills'].value = data.skills || '';
            form.elements['experience'].value = data.experience || '';
            form.elements['education'].value = data.education || '';
            form.elements['projects'].value = data.projects || '';
        }

    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

// 2. Load the selected preview (Your original function - stays the same)
function showPreview(num) {
    document.getElementById("previewFrame").src = `../templates/preview${num}.html`;
    document.getElementById("selectedTemplate").value = num;
}

// 3. Generate PDF using backend (Updated for AWS Lambda/API Gateway response)
async function generatePDF(event) {
    event.preventDefault();

    const formData = new FormData(document.getElementById("resumeForm"));
    const data = {};

    formData.forEach((value, key) => {
        data[key] = value;
    });

    try {
        // UPDATE: Call the live API Gateway endpoint
        const response = await fetch(`${API_BASE_URL}/generate-pdf`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`PDF generation failed: ${errorBody.message || 'Server error'}`);
        }

        // UPDATE: AWS Lambda returns a JSON object with a downloadUrl
        const result = await response.json();
        
        if (result.downloadUrl) {
            // Open the Pre-Signed S3 URL to start the download
            window.open(result.downloadUrl, '_blank');
            alert("PDF generated successfully! Starting download.");
        } else {
            throw new Error("Missing download URL in response from AWS.");
        }

    } catch (err) {
        alert("Error: " + err.message);
    }
}