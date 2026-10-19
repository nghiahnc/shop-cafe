'use client';
import { useEffect, useState } from 'react';

// Prevent server-rendered controls from accepting input before their handlers exist.
export default function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
