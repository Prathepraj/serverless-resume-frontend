// ====================================================================
// 1. CONFIGURATION (CRITICAL: AWS & API ENDPOINTS)
// ====================================================================

// **PASTE YOUR API GATEWAY INVOKE URL HERE**
const API_BASE_URL = 'https://367u3zw691.execute-api.eu-north-1.amazonaws.com/prod';

// Cognito Config (Confirm your Region, UserPoolId, and ClientId are correct)
const amplifyConfig = {
    Auth: {
        region: 'eu-north-1',
        userPoolId: 'eu-north-1_otaYWhBnF',
        userPoolWebClientId: '2ic0m094ag96r8jimm81m0oflh',
    }
};

Amplify.configure(amplifyConfig);

// --- Global variable to store the selected template ID ---
let selectedTemplateId = 1; // Default to Template 1

// ====================================================================
// 2. AUTHENTICATION HANDLERS
// ====================================================================

// Function to start the sign-in process
function signIn() {
    // This tells Cognito to start the login process via the Hosted UI.
    Amplify.Auth.federatedSignIn();
}

// Function to sign out the user
async function signOut() {
    try {
        await Amplify.Auth.signOut();
        // Force reload to trigger sign-in check
        window.location.reload(); 
    } catch (error) {
        console.log('Error signing out: ', error);
    }
}

// Check for authentication status on page load
async function checkAuthStatus() {
    try {
        // Try to get the current session. If successful, user is authenticated.
        await Amplify.Auth.currentSession();
        console.log("User is authenticated. Loading application.");
        // If authenticated, we proceed to load the data
        loadProfileData(); 
        
    } catch (error) {
        console.log("User is not authenticated. Redirecting to sign-in.");
        // If not authenticated, force the sign-in redirect
        signIn();
    }
}

// ====================================================================
// 3. SECURE API CALL WRAPPER
// ====================================================================

// Wrapper function to add the JWT to all API calls
async function authenticatedFetch(path, method, body = null) {
    try {
        const session = await Amplify.Auth.currentSession();
        // Get the JWT from the session
        const idToken = session.getIdToken().getJwtToken(); 

        const headers = { 
            "Content-Type": "application/json",
            // CRITICAL: Sends token to API Gateway for authorization
            "Authorization": idToken 
        };

        const config = {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : null
        };
        
        const response = await fetch(`${API_BASE_URL}${path}`, config);

        if (!response.ok) {
            // Throw error to be caught below
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        return response.json();

    } catch (error) {
        console.error("Authenticated API call error:", error);
        // If the error is likely due to an expired or missing token, sign out/redirect
        if (error.message.includes('No current user') || error.message.includes('API call failed: 401')) {
             alert("Session expired or unauthorized. Please sign in again.");
             signOut();
        }
        throw error;
    }
}

// ====================================================================
// 4. API & TEMPLATE FUNCTIONS
// ====================================================================

// Function to handle showing the template preview
function showPreview(templateId) {
    selectedTemplateId = templateId; // Update the global variable
    console.log(`Template ${templateId} selected.`);
    
    // Update the hidden form field that generatePDF will read
    document.getElementById('selectedTemplate').value = templateId;
    
    // --- TEMPLATE PREVIEW LOGIC ---
    // This updates the iframe content to show a selection confirmation.
    const previewFrame = document.getElementById('previewFrame');
    if (previewFrame) {
        previewFrame.srcdoc = `
            <div style="font-family: Arial; padding: 20px;">
                <h2>Preview of Template ${templateId}</h2>
                <p>The selected template ID is now set for PDF generation. You may now fill out the form.</p>
            </div>
        `;
    }
}


async function loadProfileData() {
    // This is where you call the secure GET /profile endpoint
    try {
        const data = await authenticatedFetch("/profile", "GET");
        console.log("Profile Data Loaded:", data);
        // --- TODO: Add logic here to populate your form fields with data ---
    } catch (error) {
        console.error("Failed to load profile data.");
    }
}

async function generatePDF(event) {
    // Prevent the default form submission (page reload)
    event.preventDefault(); 
    
    // Capture data from the HTML form (simplified example)
    const form = document.getElementById('resumeForm');
    const resumeData = { 
        name: form.name.value, 
        email: form.email.value, 
        phone: form.phone.value, 
        location: form.location.value,
        skills: form.skills.value,
        experience: form.experience.value,
        education: form.education.value,
        projects: form.projects.value,
        // Read the currently selected template ID from the hidden field
        template: form.template.value 
    };

    try {
        console.log("Attempting to generate PDF with data:", resumeData);
        // Call the secure POST /generate-pdf endpoint
        const result = await authenticatedFetch("/generate-pdf", "POST", resumeData);
        
        // Result should contain the presigned URL for download
        if (result && result.downloadUrl) {
            alert("PDF generated successfully! Starting download.");
            window.open(result.downloadUrl, '_blank');
        } else {
            alert("PDF generation successful, but no download URL received.");
        }

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Error generating PDF. Check the console for API error details.");
    }
}

// ====================================================================
// 5. INITIALIZATION
// ====================================================================

// 1. Start the authentication check when the page finishes loading (CRITICAL for redirect)
window.onload = checkAuthStatus;

// 2. Bind the generation function to the button and initialize the template preview
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the template preview on load to Template 1
    showPreview(1); 
});