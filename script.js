// Configuration
const API_BASE_URL = 'https://ai-staff-chief-of-staff.ambitioussea-9ca2abb1.centralus.azurecontainerapps.io';

// DOM elements
const chatMessages = document.getElementById('chat-messages' );
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const voiceButton = document.getElementById('voice-button');
const settingsButton = document.getElementById('settings-button');
const dashboardModal = document.getElementById('dashboard-modal');
const settingsModal = document.getElementById('settings-modal');

// State
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    setupEventListeners();
    addMessage('Hello! I\'m your AI Chief of Staff. I\'m here to help you with cost tracking, project management, strategic planning, and operational oversight.\n\nYou can ask me about budget status, project health, team coordination, or any strategic questions you have.', 'assistant');
});

// Event listeners
function setupEventListeners() {
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    voiceButton.addEventListener('click', toggleVoiceRecording);
    settingsButton.addEventListener('click', showSettings);

    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target === dashboardModal) {
            closeDashboard();
        }
        if (event.target === settingsModal) {
            closeSettings();
        }
    }
}

// Send message - FIXED VERSION WITH ROBUST RESPONSE HANDLING
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;

    // Add user message
    addMessage(message, 'user');
    messageInput.value = '';
    autoResize();

    // Show typing indicator
    showTyping();

    try {
        console.log('Sending request to:', `${API_BASE_URL}/chat`);
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message
            })
        });

        console.log('Response status:', response.status, response.statusText);

        // Hide typing indicator
        hideTyping();

        if (response.ok) {
            // FIXED: Robust response handling for multiple formats
            let responseText;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    // Try JSON parsing first
                    const data = await response.json();
                    console.log('JSON response received:', data);
                    
                    // Handle multiple possible JSON structures
                    if (typeof data === 'string') {
                        responseText = data;
                    } else if (data.response) {
                        responseText = data.response;
                    } else if (data.message) {
                        responseText = data.message;
                    } else if (data.content) {
                        responseText = data.content;
                    } else {
                        // If JSON but unknown structure, stringify it
                        responseText = JSON.stringify(data);
                    }
                } else {
                    // If not JSON, treat as plain text
                    responseText = await response.text();
                    console.log('Text response received:', responseText.substring(0, 100) + '...');
                }
            } catch (parseError) {
                console.log('JSON parsing failed, trying text:', parseError);
                // If JSON parsing fails, try as plain text
                try {
                    responseText = await response.text();
                    console.log('Fallback text response:', responseText.substring(0, 100) + '...');
                } catch (textError) {
                    console.error('Both JSON and text parsing failed:', textError);
                    responseText = 'Response received but could not be processed. Please try again.';
                }
            }

            // Ensure we have a valid response
            if (!responseText || responseText.trim() === '') {
                responseText = 'Response received successfully, but content was empty.';
            }

            addMessage(responseText, 'assistant');
            
        } else {
            console.error('HTTP error:', response.status, response.statusText);
            addMessage(`I apologize, but I encountered an error (${response.status}). Please try again.`, 'assistant');
        }

    } catch (error) {
        console.error('Network or other error:', error);
        // Hide typing indicator
        hideTyping();
        addMessage('I apologize, but I encountered an error connecting to the AI service. Please ensure the Chief of Staff API is running and accessible.', 'assistant');
    }
}

// Voice recording functionality
async function toggleVoiceRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await sendVoiceMessage(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            voiceButton.textContent = '🔴';
            voiceButton.title = 'Stop Recording';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            addMessage('Unable to access microphone. Please check your permissions.', 'assistant');
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        voiceButton.textContent = '🎤';
        voiceButton.title = 'Voice Input';
    }
}

async function sendVoiceMessage(audioBlob) {
    showTyping();

    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        const response = await fetch(`${API_BASE_URL}/voice/conversation`, {
            method: 'POST',
            body: formData
        });

        hideTyping();

        if (response.ok) {
            const data = await response.json();
            addMessage(data.transcription, 'user');
            addMessage(data.response, 'assistant');
        } else {
            addMessage('I apologize, but I encountered an error processing your voice message.', 'assistant');
        }
    } catch (error) {
        hideTyping();
        addMessage('I apologize, but I encountered an error with voice processing.', 'assistant');
    }
}

// Message display functions
function addMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = sender === 'user' ? 'You' : 'CS';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messageDiv.appendChild(timestamp);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

let isTyping = false;

function showTyping() {
    if (isTyping) return;
    isTyping = true;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'CS';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    isTyping = false;
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
}

// Dashboard functions
function showDashboard() {
    dashboardModal.style.display = 'block';
}

// Close dashboard
function closeDashboard() {
    dashboardModal.style.display = 'none';
}

// Load dashboard data on startup
async function loadDashboard() {
    try {
        await fetch(`${API_BASE_URL}/dashboard`);
    } catch (error) {
        console.log('Dashboard data not available yet');
    }
}

// Show settings (placeholder)
function showSettings() {
    addMessage('⚙️ Settings panel coming soon! This will include voice settings, theme options, and notification preferences.', 'assistant');
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === dashboardModal) {
        closeDashboard();
    }
}
