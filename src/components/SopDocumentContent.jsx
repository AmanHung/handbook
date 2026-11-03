import { ExternalLink } from 'lucide-react';
const processSopImageUrl = (url) => {
  if (!url) return { isImage: false, src: '' };
  const lowerUrl = url.toLowerCase();
  const isStandardImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)($|\?)/)
    || (lowerUrl.includes('firebasestorage') && lowerUrl.includes('alt=media'));
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    || url.match(/drive\.google\.com\/open\?id=([^&]+)/)
    || url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  const fileId = driveMatch?.[1];

  if (isStandardImage) return { isImage: true, src: url };
  if (fileId) {
    return {
      isImage: true,
      src: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
    };
  }
  return { isImage: false, src: url };
};

const SopDocumentContent = ({ text }) => {
  if (!text) return null;
  const regex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    const isImage = match[1] === '!';
    const label = match[2];
    const url = match[3];
    const imageInfo = processSopImageUrl(url);
    parts.push(isImage
      ? { type: 'image', alt: label, url: imageInfo.isImage ? imageInfo.src : url }
      : { type: 'link', label: label || url, url });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
      {parts.map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.content}</span>;
        if (part.type === 'image') {
          return (
            <figure key={index} className="my-5">
              <img src={part.url} alt={part.alt} className="max-w-full h-auto rounded-xl border border-gray-200 shadow-sm" loading="lazy" />
              {part.alt && <figcaption className="text-xs text-gray-500 text-center mt-2">{part.alt}</figcaption>}
            </figure>
          );
        }
        return (
          <a key={index} href={part.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-bold inline-flex items-center gap-1">
            {part.label}<ExternalLink className="w-3.5 h-3.5" />
          </a>
        );
      })}
    </div>
  );
};

export default SopDocumentContent;
