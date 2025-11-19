// Utility function to render text with markdown bold (**text**) as highlighted spans
export function renderHighlightedText(text: string) {
    if (!text) return text;

    // Split by **text** pattern and render with highlighting
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            // Remove the ** markers and highlight
            const content = part.slice(2, -2);
            return (
                <span
                    key={index}
                    className="font-semibold text-blue-700 underline decoration-2 decoration-blue-400 underline-offset-2"
                >
                    {content}
                </span>
            );
        }
        return <span key={index}>{part}</span>;
    });
}
