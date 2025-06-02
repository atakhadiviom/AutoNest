
import type { MetadataRoute } from 'next';
import { mockWorkflows } from '@/lib/mock-data';

const baseUrl = 'https://autonest.site'; // Replace with your actual domain

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '/',
    '/landing',
    '/login',
    '/signup',
    '/forgot-password', // Added forgot-password page
    '/privacy-policy',
    '/user-agreement',
    '/blog/building-autonest',
    '/billing',
    '/dashboard', // Note: Dashboard requires login
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '/' || route === '/landing' ? 'weekly' : 'monthly' as ('always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'),
    priority: route === '/' || route === '/landing' ? 1.0 : 0.8,
  }));

  const workflowPages = mockWorkflows.map((workflow) => ({
    url: `${baseUrl}/workflows/${workflow.id}`,
    lastModified: new Date(workflow.updatedAt).toISOString(),
    changeFrequency: 'weekly' as ('always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'),
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...workflowPages,
  ];
}
