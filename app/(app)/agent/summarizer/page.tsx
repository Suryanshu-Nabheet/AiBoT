"use client";

import { useState } from "react";
import { Upload, FileText, ArrowRight, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AssignmentSummarizerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [task, setTask] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) added`);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSummarize = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }
    if (!task.trim()) {
      toast.error("Please describe what you want to do with these files");
      return;
    }

    setIsProcessing(true);

    try {
      // In a real app, we would upload files via FormData.
      // Here, we'll send the task to the AI to simulate the "Agent" response
      // or assuming the text is extracted.
      // For this demo, we'll send the task and file names.
      const response = await fetch("/api/agent/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          fileNames: files.map((f) => f.name),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process request");
      }

      const data = await response.json();
      setResult(data.summary);
      toast.success("Processing complete!");
    } catch (error) {
      toast.error("Error processing request");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-blue-600">
            Summarizer
          </h1>

          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Upload your lectures, notes, or assignments (PDF, DOCX, PPT, TXT)
            and let our AI summarize, extract key points, or answer questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="bg-card border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 group cursor-pointer relative overflow-hidden min-h-[300px]">
              <Input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              />
              <div className="bg-blue-50 rounded-full p-4 group-hover:scale-110 transition-transform duration-300">
                <Upload className="size-8 text-blue-600" weight="duotone" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">
                  Drop files here or click to upload
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Support for PDF, Docs, Slides, Text
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {files.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-3 bg-card border rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="bg-blue-100 p-2 rounded text-blue-600 shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Task Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-4"
          >
            <div className="bg-card border rounded-xl p-6 h-full flex flex-col shadow-sm">
              <h3 className="font-semibold text-lg mb-4">What should I do?</h3>
              <div className="flex-1">
                <textarea
                  className="w-full h-full min-h-[200px] p-4 bg-muted/30 rounded-lg border-0 resize-none focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/50"
                  placeholder="E.g., Summarize these lectures into bullet points, or Find all deadlines mentioned in these documents..."
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                  onClick={handleSummarize}
                  disabled={isProcessing || files.length === 0}
                >
                  {isProcessing ? "Processing..." : "Start Processing"}
                  {!isProcessing && <ArrowRight className="ml-2 size-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-xl p-8 shadow-sm mb-8"
            >
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500" />
                Result
              </h3>
              <div className="prose prose-blue max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-lg">
                  {result}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
