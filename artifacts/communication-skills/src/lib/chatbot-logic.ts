import { knowledgeBase } from "../data/knowledgeBase";

export function generateBotResponse(userInput: string): string {
  const lowerInput = userInput.toLowerCase().trim();

  // 1. Check for sentence improvement explicitly
  if (lowerInput.startsWith("improve:") || lowerInput.startsWith("correct:")) {
    const sentence = userInput.replace(/^(improve|correct):\s*/i, "").trim();
    if (!sentence) return "Please provide a sentence after 'improve:' so I can help!";
    return improveSentence(sentence);
  }

  // 2. Keyword Matching
  
  // 7C's
  if (lowerInput.includes("7c") || lowerInput.includes("seven c")) {
    return "The 7 C's of Communication are:\n\n" + 
           knowledgeBase.sevenCs.map(c => `**${c.name}**: ${c.description}`).join("\n\n") +
           "\n\nWhich of these would you like to practice?";
  }
  
  // Grammar
  if (lowerInput.includes("grammar") || lowerInput.includes("rule")) {
    const tip = knowledgeBase.grammarRules[Math.floor(Math.random() * knowledgeBase.grammarRules.length)];
    return `Here is a grammar tip for you:\n\n**${tip.title}**\n${tip.text}\n\nWould you like another tip or want me to check a sentence for you? (Type "improve: [your sentence]")`;
  }

  // Interview
  if (lowerInput.includes("interview") || lowerInput.includes("job")) {
    return "Preparing for an interview? Here are top tips:\n\n" +
           knowledgeBase.interviewTips.map(i => `• **${i.title}**: ${i.text}`).join("\n") +
           "\n\nDo you want to practice answering a question?";
  }

  // Email
  if (lowerInput.includes("email") || lowerInput.includes("letter")) {
    return "Professional email writing is crucial. Keep these in mind:\n\n" +
           knowledgeBase.emailWriting.map(e => `• **${e.title}**: ${e.text}`).join("\n") +
           "\n\nWant me to review an email draft for you? Just type 'improve:' followed by your draft.";
  }

  // Vocabulary
  if (lowerInput.includes("vocab") || lowerInput.includes("word")) {
    const word = knowledgeBase.vocabulary[Math.floor(Math.random() * knowledgeBase.vocabulary.length)];
    return `**Word of the Moment:**\n\n**${word.word}**: ${word.meaning}\n\nTry using it in a sentence today!`;
  }

  // Greetings
  if (["hi", "hello", "hey", "greetings", "good morning"].includes(lowerInput)) {
    return "Hello there! 👋 I'm your AI Communication Coach. I can help you with grammar, vocabulary, interview tips, or improving a specific sentence. What would you like to work on today?";
  }

  // Catch-all implicit sentence improvement if they type a long sentence without keywords
  if (userInput.split(" ").length > 5 && !lowerInput.includes("what") && !lowerInput.includes("how")) {
    return improveSentence(userInput);
  }

  // Default Fallback
  return "I'm here to help you improve your communication skills! You can ask me about the **7 C's**, **interview tips**, **grammar**, **email writing**, or just say **'improve: [your sentence]'** to get feedback on your writing.";
}

function improveSentence(sentence: string): string {
  // A simulated AI improvement logic
  let suggestion = sentence;
  let explanation = "";

  // Fake passive voice check
  if (sentence.toLowerCase().includes("was") || sentence.toLowerCase().includes("by")) {
    suggestion = sentence.replace(/was\s(\w+)ed\sby/i, "[$1]ed").replace(/was\s(\w+)\sby/i, "[$1]");
    explanation = "I noticed you might be using the passive voice. Using active voice makes your sentence stronger and more direct.";
  } 
  // Fake filler words check
  else if (sentence.toLowerCase().includes("very") || sentence.toLowerCase().includes("really")) {
    suggestion = sentence.replace(/\b(very|really)\s/gi, "");
    explanation = "I removed filler words like 'very' or 'really'. Omitting them makes your communication more concise and impactful.";
  }
  else {
    // Generic improvement
    suggestion = sentence.charAt(0).toUpperCase() + sentence.slice(1) + (sentence.endsWith(".") ? "" : ".");
    explanation = "Your sentence structure looks okay! I just ensured proper capitalization and punctuation. To make it punchier, try replacing common verbs with strong action verbs.";
  }

  return `Here is some feedback on your sentence:\n\n**Original:** "${sentence}"\n**Suggested:** "${suggestion}"\n\n**Why?** ${explanation}`;
}
