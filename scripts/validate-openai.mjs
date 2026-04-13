const key = process.env.OPENAI_API_KEY;
if (!key || !key.startsWith('sk-')) {
  console.error('OPENAI_API_KEY not set or invalid format');
  process.exit(1);
}
const response = await fetch('https://api.openai.com/v1/models', {
  headers: { 'Authorization': 'Bearer ' + key }
});
if (response.ok) {
  console.log('OpenAI API key is valid. Status:', response.status);
} else {
  const text = await response.text();
  console.error('OpenAI API key validation failed. Status:', response.status, text.slice(0, 200));
  process.exit(1);
}
