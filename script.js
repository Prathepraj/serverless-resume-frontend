// ====================================================================
// 1. CONFIGURATION (CRITICAL: AWS & API ENDPOINTS)
// ====================================================================

const API_BASE_URL = 'https://367u3zw691.execute-api.eu-north-1.amazonaws.com/prod';

// Cognito Config (Includes the critical Domain fix for redirect)
const amplifyConfig = {
    Auth: {
        region: 'eu-north-1',
        userPoolId: 'eu-north-1_otaYWhBnF',
        userPoolWebClientId: '2ic0m094ag96r8jimm81m0oflh',
        
        // Hosted UI Domain
        domain: 'eu-north-1otaywhbnf.auth.eu-north-1.amazoncognito.com', 
        
        // Redirect URLs (Must exactly match what you saved in Cognito)
        redirectSignIn: 'https://serverless-resume-frontend.vercel.app/', 
        redirectSignOut: 'https://serverless-resume-frontend.vercel.app/',
        
        responseType: 'code' 
    }
};

Amplify.configure(amplifyConfig);

// --- Global variable to store the selected template ID ---
let selectedTemplateId = 1; // Default to Template 1

// ====================================================================
// 2. AUTHENTICATION HANDLERS
// ====================================================================

function signIn() {
    Amplify.Auth.federatedSignIn();
}

async function signOut() {
    try {
        await Amplify.Auth.signOut();
        window.location.reload(); 
    } catch (error) {
        console.log('Error signing out: ', error);
    }
}

async function checkAuthStatus() {
    try {
        await Amplify.Auth.currentSession();
        console.log("User is authenticated. Loading application.");
        loadProfileData(); 
        
    } catch (error) {
        console.log("User is not authenticated. Redirecting to sign-in.");
        signIn();
    }
}

// ====================================================================
// 3. SECURE API CALL WRAPPER (No changes needed)
// ====================================================================

async function authenticatedFetch(path, method, body = null) {
    try {
        const session = await Amplify.Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken(); 
        const headers = { "Content-Type": "application/json", "Authorization": idToken };
        const config = { method: method, headers: headers, body: body ? JSON.stringify(body) : null };
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

// **FIXED PREVIEW LOGIC**
function showPreview(templateId) {
    selectedTemplateId = templateId; 
    document.getElementById('selectedTemplate').value = templateId;
    
    // The iframe loads a specific HTML file based on the templateId
    const previewFrame = document.getElementById('previewFrame');
    if (previewFrame) {
        // Change the source to load the static template HTML file
        previewFrame.src = `templates/template${templateId}.html`;
    }
}


async function loadProfileData() {
    // This is where you call the secure GET /profile endpoint
    try {
        const data = await authenticatedFetch("/profile", "GET");
        console.log("Profile Data Loaded:", data);
        // TODO: Add logic here to populate your form fields with data 
    } catch (error) {
        console.error("Failed to load profile data.");
    }
}

async function generatePDF(event) {
    event.preventDefault(); 
    
    // Capture data from the HTML form 
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
        template: form.template.value // Reads the selected template ID
    };

    try {
        const result = await authenticatedFetch("/generate-pdf", "POST", resumeData);
        
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

// 2. Bind the generation function and initialize the template preview
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the template preview on load to Template 1
    showPreview(1); 
});