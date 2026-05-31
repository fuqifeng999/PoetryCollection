import { writeFileSync } from 'fs';

// ===== Helper: clean text - ensure no unescaped quotes in JSON strings =====
function q(s) {
  // Replace any remaining unescaped ASCII double quotes within the text with Chinese quotes
  return s.replace(/(?<=[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f，。、；：！？）】])"(?=[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f，。、；：！？（）【】])/g, '「')
          .replace(/(?<=[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f，。、；：！？）】]{1,10})"(?=[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f，。、；：！？（）【】])/g, '」');
}

// We'll use the approach of writing JSON via JSON.stringify which guarantees proper escaping
// So the content strings just need to not contain raw unescaped double quotes

// We already have the data files with the issue. Simpler fix:
// Read each file, parse it as JavaScript (not JSON) by using eval-like approach,
// or use a proper JSON repair library.

// Simplest approach for this case: read the text, replace inner quotes within known patterns
function fixFile(path) {
  const fs = require('fs');
  let text = fs.readFileSync(path, 'utf8');
  
  // Find all occurrences of inner quotes inside string values
  // Pattern: inside a JSON string value, there are quotes surrounded by Chinese characters
  // E.g.: 以"疑是地上霜" -> 以「疑是地上霜」
  
  // Strategy: Walk the text character by character, track whether we're inside a string,
  // and when we find a " that's inside a string and adjacent to Chinese chars, replace it
  
  let result = '';
  let inString = false;
  let prevWasColon = false;
  let prevChar = '';
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1] || '';
    
    if (c === '"' && (i === 0 || text[i-1] !== '\\')) {
      if (!inString) {
        // Entering a string
        inString = true;
        result += c;
      } else {
        // Potentially exiting a string
        // Check if this is followed by colon, comma, bracket, or whitespace+colon/comma/bracket
        const after = text.substring(i+1).match(/^[\s,:\]\}\]\}].{0,2}/);
        if (after && after[0].length > 0) {
          // This is a closing quote
          inString = false;
          result += c;
        } else if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(next)) {
          // Next char is Chinese -> this is an inner quote, replace with Chinese left quote
          result += '\u201C'; // "
        } else if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(prevChar)) {
          // Prev char is Chinese -> this might be a inner closing quote
          // Check if current char is followed by another Chinese char or punctuation
          if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s，。、；：！？）】]/.test(next) || next === ',' || next === '' || next === '\n') {
            // This looks like a closing inner quote, but we're still in the string
            // Actually this is ambiguous. Let's just replace with Chinese right quote
            result += '\u201D'; // "
          } else {
            // Keep as is - this is actually the closing quote of the JSON string
            inString = false;
            result += c;
          }
        } else {
          // Default: this is a closing JSON quote
          inString = false;
          result += c;
        }
      }
    } else {
      result += c;
    }
    if (c !== ' ') prevChar = c;
  }
  
  try {
    const parsed = JSON.parse(result);
    fs.writeFileSync(path, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
    console.log(`✅ ${path}: OK - ${parsed.length} items`);
  } catch(e) {
    console.error(`❌ ${path}: ${e.message}`);
    // Write the attempt for debugging
    fs.writeFileSync(path + '.attempt.json', result, 'utf8');
  }
}

['data/tang.json', 'data/song.json', 'data/yuan.json', 'data/modern.json'].forEach(fixFile);
