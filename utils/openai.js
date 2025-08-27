const axios = require("axios");
const openAiKey = process.env.OPEN_AI_KEY;

async function chatgpt({ title, text, manualTags }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openAiKey}`,
  };

  const prompt = `
    Extract up to 5 short, relevant tags from the following journal entry.
    The tags should be concise, single words or short phrases.

    Title: ${title}

    Text: ${text}

    Do NOT suggest any of the following tags (the user already added these manually):
${manualTags}


Return the tags as a comma-separated list, lowercase, no extra words.
  `;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt.trim(),
        },
      ],
    },
    { headers }
  );
  let tags = response.data.choices[0].message.content || "";
  return (
    tags
      //You split the array of suggested tags by the ","
      .split(",")
      //You go through the array and get rid of any whitespace from the tags
      .map((tag) => tag.trim())
      //You go through the array and make sure to get rid of any string that is empty
      .filter((tag) => tag.length > 0)
  );
}

module.exports = chatgpt;
