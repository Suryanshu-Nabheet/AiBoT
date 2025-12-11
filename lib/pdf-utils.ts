import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';
import { createRoot } from 'react-dom/client';

/**
 * Generate a professional PDF from markdown content with proper rendering
 * @param content - Markdown content to convert
 * @param filename - Output filename
 * @param title - PDF title
 */
export async function generatePDF(
  content: string,
  filename: string = 'document.pdf',
  title: string = 'Document'
) {
  try {
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.6';
    container.style.color = '#000';
    
    // Add title
    const titleEl = document.createElement('h1');
    titleEl.textContent = title;
    titleEl.style.fontSize = '24px';
    titleEl.style.fontWeight = '700';
    titleEl.style.marginBottom = '20px';
    titleEl.style.color = '#000';
    container.appendChild(titleEl);
    
    // Create content container for React Markdown
    const contentContainer = document.createElement('div');
    contentContainer.style.marginBottom = '60px';
    contentContainer.className = 'pdf-content';
    container.appendChild(contentContainer);
    
    // Add watermark
    const watermark = document.createElement('div');
    watermark.textContent = 'AiBoT by Suryanshu Nabheet';
    watermark.style.position = 'absolute';
    watermark.style.bottom = '20px';
    watermark.style.right = '40px';
    watermark.style.fontSize = '10px';
    watermark.style.color = '#666';
    watermark.style.fontStyle = 'italic';
    container.appendChild(watermark);
    
    document.body.appendChild(container);
    
    // Add styles for markdown rendering
    const style = document.createElement('style');
    style.textContent = `
      .pdf-content {
        color: #000;
      }
      .pdf-content h1 {
        font-size: 22px;
        font-weight: 700;
        margin: 24px 0 12px 0;
        color: #000;
      }
      .pdf-content h2 {
        font-size: 20px;
        font-weight: 600;
        margin: 20px 0 10px 0;
        color: #000;
      }
      .pdf-content h3 {
        font-size: 18px;
        font-weight: 600;
        margin: 16px 0 8px 0;
        color: #000;
      }
      .pdf-content p {
        margin: 12px 0;
        line-height: 1.6;
        color: #000;
      }
      .pdf-content strong {
        font-weight: 600;
        color: #000;
      }
      .pdf-content em {
        font-style: italic;
      }
      .pdf-content code {
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 13px;
        color: #000;
      }
      .pdf-content pre {
        background: #f5f5f5;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 12px 0;
        color: #000;
      }
      .pdf-content pre code {
        background: none;
        padding: 0;
        font-size: 12px;
        line-height: 1.4;
      }
      .pdf-content ul, .pdf-content ol {
        margin: 12px 0;
        padding-left: 20px;
      }
      .pdf-content li {
        margin: 4px 0;
        color: #000;
      }
      .pdf-content a {
        color: #2563eb;
        text-decoration: underline;
      }
      .pdf-content table {
        border-collapse: collapse;
        width: 100%;
        margin: 12px 0;
      }
      .pdf-content th, .pdf-content td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
        color: #000;
      }
      .pdf-content th {
        background-color: #f5f5f5;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
    
    // Render markdown using React
    const root = createRoot(contentContainer);
    await new Promise<void>((resolve) => {
      root.render(
        <ReactMarkdown>{content}</ReactMarkdown>
      );
      // Wait for render to complete
      setTimeout(resolve, 100);
    });
    
    // Use html2canvas to render
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // Cleanup
    root.unmount();
    document.body.removeChild(container);
    document.head.removeChild(style);
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Save
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}
