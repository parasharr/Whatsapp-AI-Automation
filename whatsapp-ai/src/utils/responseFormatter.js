/**
 * Formats raw AI model output into clean, WhatsApp-friendly text by stripping
 * Markdown formatting (headers, bold/italic indicators, code blocks, tables) 
 * and normalizing spacing and bullet points.
 * 
 * @param {string} text - Raw Markdown output from the AI.
 * @returns {string} - Clean, formatted conversational text.
 */
export function formatResponse(text) {
  if (!text) return "";

  let formatted = text;

  // 1. Remove Markdown headers (e.g. ### Header or ## Header)
  formatted = formatted.replace(/^#+\s*(.*?)$/gm, "$1");

  // 2. Convert markdown bullet lists (* Item, - Item, + Item) at start of lines to "• Item"
  formatted = formatted.replace(/^\s*[*+-]\s+/gm, "• ");

  // 3. Remove code blocks (triple backticks) and preserve their content
  formatted = formatted.replace(/```[a-z]*\n([\s\S]*?)```/g, "$1");
  formatted = formatted.replace(/```([\s\S]*?)```/g, "$1");

  // 4. Remove inline code backticks
  formatted = formatted.replace(/`([^`\n]+)`/g, "$1");

  // 5. Remove bold, italic, and bold-italic Markdown characters: ***text***, **text**, *text*, ___text___, __text__, _text_ (restricting to single line)
  formatted = formatted.replace(/\*\*\*([^*\n]+)\*\*\*/g, "$1");
  formatted = formatted.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  formatted = formatted.replace(/\*([^*\n]+)\*/g, "$1");
  formatted = formatted.replace(/___([^\n_]+)___/g, "$1");
  formatted = formatted.replace(/__([^\n_]+)__/g, "$1");
  formatted = formatted.replace(/_([^\n_]+)_/g, "$1");

  // 6. Clean up simple Markdown tables:
  // Remove separation lines like |---|---|
  formatted = formatted.replace(/^\s*\|[|:\-\s]+\|\s*$/gm, "");
  // Replace cell borders with simple spaces
  formatted = formatted.replace(/\|\s*([^|\n]+)\s*(?=\||$)/g, " $1 ");
  formatted = formatted.replace(/\|/g, "");

  // 7. Normalize consecutive blank lines to at most one empty line (maximum 2 newlines in a row)
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  // 8. Trim leading and trailing spaces from the overall output
  return formatted.trim();
}
