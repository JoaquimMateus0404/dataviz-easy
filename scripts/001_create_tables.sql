-- Create tables for DataViz Easy app

-- Table to store uploaded files metadata
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
  error_message TEXT
);

-- Table to store processed data columns information
CREATE TABLE IF NOT EXISTS public.data_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('string', 'number', 'date', 'boolean')),
  sample_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store the actual processed data
CREATE TABLE IF NOT EXISTS public.data_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store generated charts metadata
CREATE TABLE IF NOT EXISTS public.charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  chart_type TEXT NOT NULL CHECK (chart_type IN ('bar', 'line', 'pie', 'scatter', 'area')),
  title TEXT NOT NULL,
  x_column TEXT,
  y_column TEXT,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view their own files" ON public.uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON public.uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON public.uploaded_files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON public.uploaded_files
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for data_columns
CREATE POLICY "Users can view columns of their files" ON public.data_columns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = data_columns.file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert columns for their files" ON public.data_columns
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = data_columns.file_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for data_rows
CREATE POLICY "Users can view rows of their files" ON public.data_rows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = data_rows.file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rows for their files" ON public.data_rows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = data_rows.file_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for charts
CREATE POLICY "Users can view charts of their files" ON public.charts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = charts.file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert charts for their files" ON public.charts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = charts.file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update charts of their files" ON public.charts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = charts.file_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete charts of their files" ON public.charts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_files 
      WHERE id = charts.file_id AND user_id = auth.uid()
    )
  );
