/* ============================================================
   PRPCEM NOTES – NoteBridge | Chatbot Widget JS
   ============================================================ */

(function () {
  const fab    = document.getElementById('chatbot-fab');
  const win    = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close');
  const input  = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send');
  const body   = document.getElementById('chatbot-body');

  if (!fab || !win) return;

  const botReplies = [
    "I can help you find notes! Try searching by subject name. 📚",
    "You can filter notes by teacher, subject, or date using the filter bar above.",
    "To bookmark a note, click the ⭐ icon on any note card.",
    "Latest notes are highlighted in the 'Today's Notes' section at the top!",
    "You can preview PDF notes without downloading by clicking the 👁 icon.",
    "Need help? Ask your teacher in the Doubts & Comments section.",
    "Scheduled notes will be unlocked automatically at the release time. ⏰",
    "Download any note by clicking the ⬇ button on the note card.",
    "You'll get a notification when your teacher uploads new notes! 🔔",
    "To search across all subjects, use the smart search bar at the top.",
  ];

  let isOpen = false;

  fab.addEventListener('click', toggleChat);
  closeBtn && closeBtn.addEventListener('click', toggleChat);
  sendBtn && sendBtn.addEventListener('click', sendMessage);
  input && input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    fab.innerHTML = isOpen ? '✕' : '🤖';
    if (isOpen && body && body.children.length === 0) {
      setTimeout(() => appendMsg('Hello! 👋 I\'m NoteBot. How can I help you today?', 'bot'), 300);
    }
  }

  function sendMessage() {
    const text = input ? input.value.trim() : '';
    if (!text) return;
    appendMsg(text, 'user');
    input.value = '';
    setTimeout(() => {
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      appendMsg(reply, 'bot');
    }, 600 + Math.random() * 400);
  }

  function appendMsg(text, type) {
    if (!body) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${type} animate-fadeInUp`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }
})();
