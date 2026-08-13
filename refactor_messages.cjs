const fs = require('fs');
let content = fs.readFileSync('src/pages/messages/Messages.tsx', 'utf-8');

// 1. Add state
content = content.replace(
  /const \[typingUsers, setTypingUsers\] = useState<Set<string>>\(new Set\(\)\);/,
  `const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());\n  const [isChatClosed, setIsChatClosed] = useState(false);`
);

// 2. Remove admin_conversation_closed from selects and objects
content = content.replace(/, admin_conversation_closed/g, '');
content = content.replace(/admin_conversation_closed: [^,]+,/g, '');

// 3. Remove old local constant
content = content.replace(
  /  const isConversationClosed = [\s\S]*?\(profile\?\.role === 'admin' && selectedContact\?\.admin_conversation_closed\);/,
  ''
);

// 4. Update isConversationClosed reference in handleSendMessage to use isChatClosed
content = content.replace(
  /if \(isConversationClosed \|\| isSupportBlocked\) return;/,
  `if (isChatClosed || isSupportBlocked) return;`
);

// 5. Replace toggleConversationStatus
const newToggle = `  const toggleConversationStatus = async () => {
    if (!selectedContact || profile?.role !== 'admin') return;

    const p1 = user.id < selectedContact.id ? user.id : selectedContact.id;
    const p2 = user.id < selectedContact.id ? selectedContact.id : user.id;
    const newStatus = !isChatClosed;

    try {
      const { error } = await supabase
        .from('conversation_status')
        .upsert({ 
          participant1_id: p1,
          participant2_id: p2,
          is_closed: newStatus,
          closed_by: user.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'participant1_id, participant2_id' });

      if (error) throw error;
      setIsChatClosed(newStatus);
    } catch (err) {
      console.error('Erreur lors de la modification du statut de la conversation', err);
    }
  };`;

content = content.replace(
  /  const toggleConversationStatus = async \(\) => \{[\s\S]*?  \};/,
  newToggle
);

// 6. Add useEffect for fetching and listening to conversation_status
const newEffect = `  useEffect(() => {
    if (!selectedContact || !user) return;

    const p1 = user.id < selectedContact.id ? user.id : selectedContact.id;
    const p2 = user.id < selectedContact.id ? selectedContact.id : user.id;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('conversation_status')
        .select('is_closed')
        .eq('participant1_id', p1)
        .eq('participant2_id', p2)
        .maybeSingle();
        
      setIsChatClosed(data?.is_closed || false);
    };

    fetchStatus();

    const statusChannel = supabase.channel(\`status_\${p1}_\${p2}\`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversation_status'
      }, payload => {
        if (payload.new && payload.new.participant1_id === p1 && payload.new.participant2_id === p2) {
          setIsChatClosed(payload.new.is_closed);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [selectedContact, user]);

  useEffect(() => {
    checkUserAndFetchMessages();
  }, []);`;

content = content.replace(
  /  useEffect\(\(\) => \{\n    checkUserAndFetchMessages\(\);\n  \}, \[\]\);/,
  newEffect
);

// 7. Update UI references
content = content.replace(
  /\{selectedContact\.admin_conversation_closed \? 'Rouvrir la conversation' : 'Clôturer la conversation'\}/,
  `{isChatClosed ? 'Rouvrir la conversation' : 'Clôturer la conversation'}`
);

content = content.replace(
  /\{isConversationClosed \? \(/,
  `{isChatClosed ? (`
);

fs.writeFileSync('src/pages/messages/Messages.tsx', content);