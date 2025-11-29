// ====================================================================
// 1. CONFIGURATION (Update with your API Gateway Endpoint)
// ====================================================================

const API_BASE_URL = 'https://367u3zw691.execute-api.eu-north-1.amazonaws.com/prod';
// Cognito Config
const amplifyConfig = {
    Auth: {
        region: 'eu-north-1',
        userPoolId: 'eu-north-1_otaYWhBnF', // Your User Pool ID
        userPoolWebClientId: '2ic0m094ag96r8jimm81m0oflh', // Your App Client ID
    }
};

Amplify.configure(amplifyConfig);

// ====================================================================
// 2. AUTHENTICATION HANDLERS
// ====================================================================

// Function to start the sign-in process
function signIn() {
    Amplify.Auth.federatedSignIn();
}

// Function to sign out the user
async function signOut() {
    try {
        await Amplify.Auth.signOut();
        // Redirect to sign in after sign out
        window.location.reload(); 
    } catch (error) {
        console.log('error signing out: ', error);
    }
}

// Check for authentication status on page load
async function checkAuthStatus() {
    try {
        // This will throw an error if the user is not authenticated
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
        const idToken = session.getIdToken().getJwtToken(); // Get the JWT

        const headers = { 
            "Content-Type": "application/json",
            "Authorization": idToken // CRITICAL: Sends token to API Gateway
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
// 4. API FUNCTIONS (Stubs for demonstration)
// ====================================================================

async function loadProfileData() {
    // This is where you call the secure GET /profile endpoint
    try {
        const data = await authenticatedFetch("/profile", "GET");
        console.log("Profile Data Loaded:", data);
        // --- Add logic here to populate your form fields with data ---
    } catch (error) {
        console.error("Failed to load profile data.");
    }
}

async function generatePDF() {
    // Example payload (replace with actual form data capture)
    const resumeData = { 
        name: "John Doe", 
        email: "john@example.com", 
        template: document.getElementById('template-select').value 
    };

    try {
        // Call the secure POST /generate-pdf endpoint
        const result = await authenticatedFetch("/generate-pdf", "POST", resumeData);
        
        // Result should contain the presigned URL for download
        if (result && result.downloadUrl) {
            console.log("PDF generated. Starting download.");
            window.open(result.downloadUrl, '_blank');
        } else {
            alert("PDF generation successful, but no download URL received.");
        }

    } catch (error) {
        console.error("Failed to generate PDF.");
        alert("Error generating PDF. Please check the console.");
    }
}

// ====================================================================
// 5. INITIALIZATION
// ====================================================================

// Start the authentication check when the page finishes loading
window.onload = checkAuthStatus;

// Bind the generation function to the button (make sure your button ID is correct)
document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generate-pdf-btn');
    if (generateButton) {
        generateButton.addEventListener('click', generatePDF);
    }
});