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

// Load dashboard data on startup
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        const data = await response.json();
        
        // Update dashboard content
        dashboardContent.innerHTML = `<p style="color: #2c3e50;">Dashboard data not available yet.</p>`;
        
    } catch (error) {
        console.log('Dashboard data not available yet.');
        dashboardContent.innerHTML = `<p style="color: #2c3e50;">Dashboard data not available yet.</p>`;
    }
}

// Show settings (placeholder)
function showSettings() {
    addMessage('⚙️ Settings panel coming soon! This feature will allow you to customize your AI assistant preferences.', 'system');
}

// Close dashboard
function closeDashboard() {
    dashboardModal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === dashboardModal) {
        closeDashboard();
    }
}

// Send message
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
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: {}
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Hide typing indicator
        hideTyping();
        
        // Add assistant response
        addMessage(data.response, 'assistant');
        
    } catch (error) {
        // Hide typing indicator
        hideTyping();
        
        // Show error message
        addMessage('I apologize, but I encountered an error connecting to the AI service. Please ensure the Chief of Staff API is running on port 8001.', 'assistant');
        console.error('Error:', error);
    }
}

// Voice recording functionality
function toggleVoiceRecording() {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendVoiceMessage(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        voiceButton.innerHTML = '⏹️';
        voiceButton.style.backgroundColor = '#e74c3c';
        
        addMessage('🎤 Recording... Click the stop button when finished.', 'system');
        
    } catch (error) {
        addMessage('❌ I had trouble processing your voice input. The voice feature is in demo mode. Please try typing your message instead.', 'system');
        console.error('Error accessing microphone:', error);
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        voiceButton.innerHTML = '🎤';
        voiceButton.style.backgroundColor = '#3498db';
    }
}

async function sendVoiceMessage(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        showTyping();
        
        const response = await fetch(`${API_BASE_URL}/voice/conversation`, {
            method: 'POST',
            body: formData
        });
        
        hideTyping();
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('audio')) {
                // Handle audio response
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
                addMessage('🔊 Playing voice response...', 'assistant');
            } else {
                // Handle JSON response
                const data = await response.json();
                addMessage(data.ai_response || 'Voice response received', 'assistant');
            }
        } else {
            throw new Error('Voice processing failed');
        }
        
    } catch (error) {
        hideTyping();
        addMessage('❌ I had trouble processing your voice input. The voice feature is in demo mode. Please try typing your message instead.', 'system');
        console.error('Voice error:', error);
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    
    if (sender === 'user') {
        avatar.textContent = 'You';
        avatar.style.backgroundColor = '#3498db';
    } else if (sender === 'assistant') {
        avatar.textContent = 'CS';
        avatar.style.backgroundColor = '#2ecc71';
    } else {
        avatar.textContent = '⚡';
        avatar.style.backgroundColor = '#f39c12';
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messageDiv.appendChild(timestamp);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Typing indicator
let isTyping = false;
let typingElement;

function showTyping() {
    if (isTyping) return;
    
    isTyping = true;
    typingElement = document.createElement('div');
    typingElement.className = 'message assistant typing';
    typingElement.innerHTML = `
        <div class="avatar" style="background-color: #2ecc71;">CS</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    if (isTyping && typingElement) {
        typingElement.remove();
        isTyping = false;
    }
}

// Auto-resize textarea
function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

messageInput.addEventListener('input', autoResize);
