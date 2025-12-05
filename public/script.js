// ====================================================================
// 1. CONFIGURATION (CRITICAL: API ENDPOINTS ONLY)
// ====================================================================

const API_BASE_URL = 'https://367u3zw691.execute-api.eu-north-1.amazonaws.com/prod';

// --- Global variable to store the selected template ID ---
var selectedTemplateId = 1; 

// ====================================================================
// 2. AUTHENTICATION & INITIALIZATION HANDLERS
// ====================================================================

// NOTE: initializeAmplifyWithConfig and amplifyConfig REMOVED.
// Initialization is now handled INLINE in index.html

function signIn() {
    // Uses the configured Hosted UI to initiate the sign-in flow
    Amplify.Auth.federatedSignIn();
}

async function signOut() {
    try {
        await Amplify.Auth.signOut();
        // Reload the page to reset the application state
        window.location.reload(); 
    } catch (error) {
        console.log('Error signing out: ', error);
    }
}

async function checkAuthStatus() {
    try {
        // Check for an active session
        await Amplify.Auth.currentSession();
        console.log("User is authenticated. Loading application.");
        loadProfileData(); 
        
    } catch (error) {
        // No session found, initiate sign-in
        console.log("User is not authenticated. Redirecting to sign-in.");
        signIn();
    }
}

// ====================================================================
// 3. SECURE API CALL WRAPPER 
// ====================================================================

/**
 * Fetches the JWT from Cognito and uses it to authorize the API Gateway request.
 */
async function authenticatedFetch(path, method, body = null) {
    try {
        // This check remains as a final guardrail.
        if (typeof Amplify === 'undefined' || typeof Amplify.Auth === 'undefined') {
            throw new Error("Amplify initialization required.");
        }

        const session = await Amplify.Auth.currentSession();
        // Get the ID Token (the JWT used for authorization)
        const idToken = session.getIdToken().getJwtToken(); 
        
        const headers = { 
            "Content-Type": "application/json", 
            "Authorization": idToken // Set the JWT in the Authorization header
        };
        
        const config = { 
            method: method, 
            headers: headers, 
            body: body ? JSON.stringify(body) : null 
        };
        
        const response = await fetch(`${API_BASE_URL}${path}`, config);

        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        return response.json();

    } catch (error) {
        console.error("Authenticated API call error:", error);
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

function showPreview(templateId) {
    selectedTemplateId = templateId; 
    document.getElementById('selectedTemplate').value = templateId;
    
    const previewFrame = document.getElementById('previewFrame');
    if (previewFrame) {
        previewFrame.src = `templates/preview${templateId}.html`; 
    }
}


async function loadProfileData() {
    try {
        // This is a placeholder for the API call that was returning the message
        // const data = await authenticatedFetch("/profile", "GET"); 
        // console.log("Profile Data Loaded:", data);
        console.log("Profile data loading skipped to ensure clean flow.");
    } catch (error) {
        console.error("Failed to load profile data.");
    }
}

async function generatePDF(event) {
    event.preventDefault();
    
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
        template: form.template.value
    };

    try {
        const result = await authenticatedFetch("/generate-pdf", "POST", resumeData);
        
        if (result && result.pdfUrl) {
            alert("PDF generated successfully! Starting download.");
            window.open(result.pdfUrl, '_blank');
        } else {
            alert("PDF generation successful, but no download URL received.");
        }

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        alert("Error generating PDF. Check the console for API error details.");
    }
}