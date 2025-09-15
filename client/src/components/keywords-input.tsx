'use client';

import { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface KeywordsInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
  maxKeywords?: number;
  minKeywords?: number;
  placeholder?: string;
}

export default function KeywordsInput({
  keywords,
  onChange,
  maxKeywords = 15,
  minKeywords = 3,
  placeholder = "Add keyword and press Enter"
}: KeywordsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addKeyword = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed) && keywords.length < maxKeywords) {
      onChange([...keywords, trimmed]);
      setInputValue('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    onChange(keywords.filter(keyword => keyword !== keywordToRemove));
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={keywords.length >= maxKeywords}
        />
        <Button 
          type="button" 
          onClick={addKeyword}
          disabled={!inputValue.trim() || keywords.length >= maxKeywords}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="flex items-center gap-1">
              {keyword}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeKeyword(keyword)}
              />
            </Badge>
          ))}
        </div>
      )}
      
      <div className="text-sm text-muted-foreground">
        {keywords.length}/{maxKeywords} keywords
        {minKeywords > 0 && ` (minimum ${minKeywords} required)`}
      </div>
    </div>
  );
}