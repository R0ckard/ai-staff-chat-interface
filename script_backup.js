// Configuration
const API_BASE_URL = 'http://localhost:8001';
let isTyping = false;

// DOM Elements
const messagesContainer = document.getElementById('messagesContainer' );
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const dashboardModal = document.getElementById('dashboardModal');

// Initialize chat
document.addEventListener('DOMContentLoaded', function() {
    messageInput.focus();
    loadDashboard();
});

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send message function
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;

    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    
    // Show typing indicator
    showTyping();
    
    try {
        // Send to API
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Hide typing indicator and add response
        hideTyping();
        addMessage(data.response, 'assistant');
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTyping();
        addMessage('I apologize, but I encountered an error processing your request. Please try again.', 'assistant', true);
    }
}

// Send quick message
function sendQuickMessage(message) {
    messageInput.value = message;
    sendMessage();
}

// Add message to chat
function addMessage(content, sender, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-user-tie"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    if (isError) {
        messageContent.style.background = '#e74c3c';
        messageContent.style.color = 'white';
    }
    
    const messageText = document.createElement('p');
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
                <p style="margin: 0; color: #2c3e50;"><strong>AI Status:</strong> ${data.ai_status.enabled ? 'Fully Operational' : 'Demo Mode'} • Model: ${data.ai_status.model}</p>
            </div>
        `;
        
    } catch (error) {
        dashboardContent.innerHTML = '<p style="color: #e74c3c;">Error loading dashboard data.</p>';
    }
}

// Close dashboard
function closeDashboard() {
    dashboardModal.style.display = 'none';
}

// Load dashboard data on startup
async function loadDashboard() {
    // This runs in the background to cache dashboard data
    try {
        await fetch(`${API_BASE_URL}/dashboard`);
    } catch (error) {
        console.log('Dashboard data not available yet');
    }
}

// Show settings (placeholder)
function showSettings() {
    alert('Settings panel coming soon! This will include voice settings, theme options, and notification preferences.');
}

// Toggle voice (placeholder for future voice interface)
function toggleVoice() {
    alert('Voice interface coming next! This will enable speech-to-text input and text-to-speech responses.');
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
    addMessage('Connection lost. Messages will be sent when connection is restored.', 'assistant', true);
});
