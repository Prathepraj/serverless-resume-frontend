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
        
        // Hosted UI Domain (This enables the sign-in redirect)
        domain: 'eu-north-1otaywhbnf.auth.eu-north-1.amazoncognito.com', 
        
        // Redirect URLs (Must exactly match what you saved in Cognito)
        // Ensure you use the correct Vercel URL with a trailing slash
        redirectSignIn: 'https://serverless-resume-frontend.vercel.app/', 
        redirectSignOut: 'https://serverless-resume-frontend.vercel.app/',
        
        responseType: 'code' 
    }
};

// --- Global variable to store the selected template ID ---
// *** FIX APPLIED HERE: Using 'var' to prevent the ReferenceError ***
var selectedTemplateId = 1; 

// ====================================================================
// 2. AUTHENTICATION & INITIALIZATION HANDLERS (CRITICAL FIX APPLIED HERE)
// ====================================================================

// Recursive function to ensure Amplify is defined before configuration
function initializeAmplify() {
    if (typeof Amplify !== 'undefined') {
        Amplify.configure(amplifyConfig);
        console.log("Amplify initialized successfully.");
        // Now that Amplify is configured, start the auth check.
        checkAuthStatus();
    } else {
        // If not defined, try again in a short time (50ms delay)
        setTimeout(initializeAmplify, 50);
    }
}

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
// 3. SECURE API CALL WRAPPER (FINAL SAFETY CHECK APPLIED HERE)
// ====================================================================

async function authenticatedFetch(path, method, body = null) {
    try {
        // --- FINAL SAFETY CHECK ---
        if (typeof Amplify === 'undefined' || typeof Amplify.Auth === 'undefined') {
            console.error("Amplify not defined. Initialization failed or not complete.");
            throw new Error("Amplify initialization required.");
        }
        // --------------------------

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
        // Only throw the error if it wasn't the Amplify initialization error
        if (error.message !== "Amplify initialization required.") {
             throw error;
        }
    }
}

// ====================================================================
// 4. API & TEMPLATE FUNCTIONS
// ====================================================================

// Preview function loads templates/preview#.html
function showPreview(templateId) {
    selectedTemplateId = templateId; 
    document.getElementById('selectedTemplate').value = templateId;
    
    const previewFrame = document.getElementById('previewFrame');
    if (previewFrame) {
        // Path assumes 'templates' is in the root directory (after the move)
        previewFrame.src = `templates/preview${templateId}.html`; 
    }
}


async function loadProfileData() {
    try {
        const data = await authenticatedFetch("/profile", "GET");
        console.log("Profile Data Loaded:", data);
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

// 1. Start the initialization chain when the page finishes loading.
// This calls initializeAmplify, which waits for Amplify to be ready, then calls checkAuthStatus.
window.onload = initializeAmplify;

// 2. Initialize the template preview 
document.addEventListener('DOMContentLoaded', () => {
    showPreview(1); 
});