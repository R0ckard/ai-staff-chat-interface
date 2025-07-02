// Configuration
const API_BASE_URL = 'http://localhost:8001';

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer' );
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const typingIndicator = document.getElementById('typingIndicator');
const dashboardModal = document.getElementById('dashboardModal');

// State
let isTyping = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    messageInput.addEventListener('input', autoResize);
    loadDashboard();
    
    // Add welcome message
    addMessage("Hello! I'm your AI Chief of Staff. I'm here to help you with cost tracking, project management, strategic planning, and operational oversight.\n\nYou can ask me about budget status, project health, team coordination, or any strategic questions you have.", 'assistant');
});

// Auto-resize textarea
function autoResize() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
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
        hideTyping();
        addMessage('I apologize, but I encountered an error connecting to the AI service. Please ensure the Chief of Staff API is running on port 8001.', 'assistant', true);
        console.error('Error:', error);
    }
}

// Send quick message
function sendQuickMessage(message) {
    messageInput.value = message;
    sendMessage();
}

// Voice recording functionality - FIXED VERSION
async function toggleVoice() {
    if (!isRecording) {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            microphonePermissionGranted = true;
            mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await processVoiceInput(audioBlob);
                
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };
            
            mediaRecorder.start();
            isRecording = true;
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            voiceBtn.title = 'Stop Recording';
            voiceBtn.style.backgroundColor = '#e74c3c';
            
            // Add visual feedback
            addMessage("🎤 Recording... (release to send)", 'system');
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                addMessage('❌ Microphone access denied. Please allow microphone access in your browser settings and try again.', 'system', true);
            } else {
                addMessage('❌ Unable to access microphone. Please check your browser permissions and try again.', 'system', true);
            }
        }
    } else {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = 'Voice Input';
        voiceBtn.style.backgroundColor = '';
    }
}

// Process voice input
async function processVoiceInput(audioBlob) {
    // Remove the recording message
    const messages = messagesContainer.children;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.textContent.includes('🎤 Recording...')) {
        lastMessage.remove();
    }
    
    showTyping();
    
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const response = await fetch(`${API_BASE_URL}/voice/conversation`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        hideTyping();
        
        // Add user message (transcribed)
        addMessage(`🎤 ${data.user_text}`, 'user');
        
        // Add assistant response
        addMessage(data.ai_response, 'assistant');
        
    } catch (error) {
        hideTyping();
        addMessage('❌ I had trouble processing your voice input. The voice feature is in demo mode. Please try typing your message instead.', 'assistant', true);
        console.error('Voice processing error:', error);
    }
}

// Add message to chat
function addMessage(content, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (sender === 'user') {
        avatar.textContent = 'You';
    } else if (sender === 'system') {
        avatar.textContent = '🔧';
        avatar.style.backgroundColor = '#95a5a6';
    } else {
        avatar.textContent = 'CS';
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (isError) {
        messageContent.style.background = '#e74c3c';
        messageContent.style.color = 'white';
    } else if (sender === 'system') {
        messageContent.style.background = '#ecf0f1';
        messageContent.style.color = '#2c3e50';
    }
    
    const messageText = document.createElement('p');
    messageText.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
    messageText.textContent = content;
    messageContent.appendChild(messageText);
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    messageContent.appendChild(messageTime);
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Show typing indicator
function showTyping() {
    isTyping = true;
    typingIndicator.style.display = 'flex';
    sendBtn.disabled = true;
    scrollToBottom();
}

// Hide typing indicator
function hideTyping() {
    isTyping = false;
    typingIndicator.style.display = 'none';
    sendBtn.disabled = false;
}

// Scroll to bottom of messages
function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// Show dashboard
async function showDashboard() {
    dashboardModal.style.display = 'flex';
    const dashboardContent = document.getElementById('dashboardContent');
    
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard`);
        const data = await response.json();
        
        dashboardContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-dollar-sign" style="color: #27ae60;"></i>
                        Cost Tracking
                    </h3>
                    <p><strong>Monthly Spend:</strong> $${data.cost_tracking.total_monthly_spend.toLocaleString()}</p>
                    <p><strong>Budget:</strong> $${data.cost_tracking.monthly_budget.toLocaleString()}</p>
                    <p><strong>Utilization:</strong> ${(data.cost_tracking.budget_utilization * 100).toFixed(1)}%</p>
                    <p><strong>Status:</strong> <span style="color: #27ae60; text-transform: capitalize;">${data.cost_tracking.status.replace('_', ' ')}</span></p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-tasks" style="color: #3498db;"></i>
                        Project Health
                    </h3>
                    <p><strong>Total Projects:</strong> ${data.project_health.total_projects}</p>
                    <p><strong>On Track:</strong> <span style="color: #27ae60;">${data.project_health.projects_on_track}</span></p>
                    <p><strong>At Risk:</strong> <span style="color: #e74c3c;">${data.project_health.projects_at_risk}</span></p>
                    <p><strong>Health Score:</strong> ${(data.project_health.average_health_score * 100).toFixed(1)}%</p>
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-chart-line" style="color: #9b59b6;"></i>
                    Top Cost Categories
                </h3>
                ${data.cost_tracking.top_categories.map(cat => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 10px; background: white; border-radius: 5px;">
                        <span>${cat.category}</span>
                        <strong>$${cat.amount.toLocaleString()}</strong>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 10px; border-left: 4px solid #27ae60;">
                <p style="margin: 0; color: #2c3e50;"><strong>AI Status:</strong> ${data.ai_status.enabled ? 'Fully Operational' : 'Demo Mode'} • Model: ${data.ai_status.model || 'Demo'}</p>
                <p style="margin: 5px 0 0 0; color: #2c3e50;"><strong>Voice Status:</strong> ${data.voice_status.whisper_available ? 'Speech-to-Text Ready' : 'Demo Mode'} • ${data.voice_status.elevenlabs_available ? 'Text-to-Speech Ready' : 'Text-to-Speech Pending Setup'}</p>
            </div>
        `;
        
    } catch (error) {
        dashboardContent.innerHTML = '<p style="color: #e74c3c;">Error loading dashboard data. Please ensure the Chief of Staff API is running.</p>';
    }
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
    addMessage('⚙️ Settings panel coming soon! This will include voice settings, theme options, and notification preferences.', 'system');
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === dashboardModal) {
        closeDashboard();
    }
}

// Handle connection status
window.addEventListener('online', function() {
    console.log('Connection restored');
});

window.addEventListener('offline', function() {
    console.log('Connection lost');
    addMessage('❌ Connection lost. Messages will be sent when connection is restored.', 'system', true);
});
