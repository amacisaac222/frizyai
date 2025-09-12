import { BlockLane, Priority, EnergyLevel, Complexity } from '@/lib/database.types'

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'work' | 'personal' | 'creative' | 'startup' | 'education'
  icon: string
  color: 'pink' | 'cyan' | 'purple' | 'yellow' | 'green'
  estimatedTimeWeeks: number
  blocks: TemplateBlock[]
}

export interface TemplateBlock {
  title: string
  content: string
  lane: BlockLane
  priority: Priority
  energy_level: EnergyLevel
  complexity: Complexity
  effort: number
  inspiration: number
  tags: string[]
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'web-app-launch',
    name: 'Web App Launch',
    description: 'Complete roadmap for building and launching a web application from concept to production.',
    category: 'startup',
    icon: '🚀',
    color: 'purple',
    estimatedTimeWeeks: 12,
    blocks: [
      {
        title: 'Define product vision and target audience',
        content: 'Create a clear vision statement, identify target users, and define core value propositions. Research market needs and competition.',
        lane: 'vision',
        priority: 'urgent',
        energy_level: 'high',
        complexity: 'complex',
        effort: 8,
        inspiration: 9,
        tags: ['vision', 'strategy', 'market-research']
      },
      {
        title: 'Set technical architecture and MVP scope',
        content: 'Choose technology stack, define system architecture, and scope the minimum viable product features.',
        lane: 'goals',
        priority: 'urgent',
        energy_level: 'high',
        complexity: 'complex',
        effort: 12,
        inspiration: 8,
        tags: ['architecture', 'mvp', 'planning']
      },
      {
        title: 'Design user interface and user experience',
        content: 'Create wireframes, user journey maps, and high-fidelity designs. Focus on intuitive navigation and conversion optimization.',
        lane: 'current',
        priority: 'high',
        energy_level: 'peak',
        complexity: 'complex',
        effort: 16,
        inspiration: 9,
        tags: ['design', 'ux', 'wireframes']
      },
      {
        title: 'Set up development environment and CI/CD',
        content: 'Configure development tools, version control, testing framework, and continuous integration/deployment pipeline.',
        lane: 'current',
        priority: 'high',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 6,
        inspiration: 5,
        tags: ['devops', 'setup', 'automation']
      },
      {
        title: 'Implement core features and functionality',
        content: 'Build the essential features defined in MVP scope. Focus on functionality over perfection at this stage.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'high',
        complexity: 'complex',
        effort: 32,
        inspiration: 7,
        tags: ['development', 'features', 'mvp']
      },
      {
        title: 'Set up analytics and monitoring',
        content: 'Implement user analytics, error tracking, performance monitoring, and key metrics dashboard.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 4,
        inspiration: 6,
        tags: ['analytics', 'monitoring', 'metrics']
      },
      {
        title: 'Create marketing landing page',
        content: 'Build a compelling landing page with clear value proposition, social proof, and conversion elements.',
        lane: 'next',
        priority: 'high',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 8,
        inspiration: 7,
        tags: ['marketing', 'landing-page', 'conversion']
      },
      {
        title: 'Plan launch strategy and marketing',
        content: 'Develop go-to-market strategy, prepare PR materials, plan social media campaigns, and identify launch channels.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'high',
        complexity: 'moderate',
        effort: 10,
        inspiration: 8,
        tags: ['marketing', 'launch', 'strategy']
      },
      {
        title: 'Technical documentation and API docs',
        content: 'Document codebase architecture, API endpoints, deployment procedures, and troubleshooting guides.',
        lane: 'context',
        priority: 'low',
        energy_level: 'low',
        complexity: 'simple',
        effort: 6,
        inspiration: 3,
        tags: ['documentation', 'api', 'maintenance']
      },
      {
        title: 'Legal requirements and compliance',
        content: 'Review privacy policy, terms of service, GDPR compliance, and other legal requirements for your target markets.',
        lane: 'context',
        priority: 'medium',
        energy_level: 'low',
        complexity: 'moderate',
        effort: 4,
        inspiration: 2,
        tags: ['legal', 'compliance', 'privacy']
      }
    ]
  },
  {
    id: 'content-marketing',
    name: 'Content Marketing Campaign',
    description: 'Strategic content marketing campaign to build brand awareness and generate qualified leads.',
    category: 'work',
    icon: '📝',
    color: 'cyan',
    estimatedTimeWeeks: 8,
    blocks: [
      {
        title: 'Build authoritative brand voice and presence',
        content: 'Establish thought leadership in your industry through consistent, valuable content that positions your brand as an expert.',
        lane: 'vision',
        priority: 'high',
        energy_level: 'high',
        complexity: 'complex',
        effort: 6,
        inspiration: 8,
        tags: ['branding', 'authority', 'thought-leadership']
      },
      {
        title: 'Generate 50 qualified leads per month',
        content: 'Create content funnel that attracts, nurtures, and converts visitors into qualified sales prospects.',
        lane: 'goals',
        priority: 'urgent',
        energy_level: 'high',
        complexity: 'complex',
        effort: 8,
        inspiration: 9,
        tags: ['lead-generation', 'conversion', 'sales-funnel']
      },
      {
        title: 'Research content topics and keywords',
        content: 'Identify high-impact topics your audience cares about. Use SEO tools to find keywords with good search volume and low competition.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 4,
        inspiration: 6,
        tags: ['research', 'seo', 'content-strategy']
      },
      {
        title: 'Create content calendar and publishing schedule',
        content: 'Plan 3 months of content with specific topics, formats, and publishing dates. Include blog posts, videos, and social content.',
        lane: 'current',
        priority: 'high',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 3,
        inspiration: 5,
        tags: ['planning', 'calendar', 'scheduling']
      },
      {
        title: 'Produce high-quality blog posts and articles',
        content: 'Write comprehensive, actionable articles that provide real value. Focus on solving specific problems your audience faces.',
        lane: 'current',
        priority: 'high',
        energy_level: 'high',
        complexity: 'moderate',
        effort: 20,
        inspiration: 7,
        tags: ['writing', 'blog', 'content-creation']
      },
      {
        title: 'Design social media promotion strategy',
        content: 'Create social media posts, graphics, and engagement tactics to amplify your content across different platforms.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 6,
        inspiration: 6,
        tags: ['social-media', 'promotion', 'engagement']
      },
      {
        title: 'Set up email marketing automation',
        content: 'Create email sequences that nurture subscribers with valuable content and guide them towards conversion.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 5,
        inspiration: 6,
        tags: ['email-marketing', 'automation', 'nurturing']
      },
      {
        title: 'Track performance and optimize campaigns',
        content: 'Monitor content performance metrics, A/B test different approaches, and iterate based on data insights.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'low',
        complexity: 'simple',
        effort: 3,
        inspiration: 5,
        tags: ['analytics', 'optimization', 'testing']
      },
      {
        title: 'Content style guide and brand guidelines',
        content: 'Document tone of voice, writing style, visual brand elements, and content creation standards for consistency.',
        lane: 'context',
        priority: 'low',
        energy_level: 'low',
        complexity: 'simple',
        effort: 2,
        inspiration: 4,
        tags: ['guidelines', 'branding', 'documentation']
      }
    ]
  },
  {
    id: 'personal-fitness',
    name: 'Personal Fitness Journey',
    description: 'Comprehensive fitness and wellness plan to achieve your health goals with sustainable habits.',
    category: 'personal',
    icon: '💪',
    color: 'green',
    estimatedTimeWeeks: 16,
    blocks: [
      {
        title: 'Become the healthiest version of myself',
        content: 'Transform my relationship with fitness and nutrition to create lasting energy, confidence, and well-being.',
        lane: 'vision',
        priority: 'high',
        energy_level: 'peak',
        complexity: 'complex',
        effort: 4,
        inspiration: 10,
        tags: ['health', 'transformation', 'lifestyle']
      },
      {
        title: 'Lose 20 pounds and gain muscle definition',
        content: 'Achieve specific body composition goals through consistent training and nutrition over the next 4 months.',
        lane: 'goals',
        priority: 'high',
        energy_level: 'high',
        complexity: 'complex',
        effort: 8,
        inspiration: 9,
        tags: ['weight-loss', 'muscle-gain', 'body-composition']
      },
      {
        title: 'Create sustainable workout routine',
        content: 'Design and implement a 4-day workout schedule that fits my lifestyle and progressively builds strength.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'high',
        complexity: 'moderate',
        effort: 3,
        inspiration: 8,
        tags: ['workout', 'routine', 'strength-training']
      },
      {
        title: 'Plan nutrition and meal prep system',
        content: 'Develop a meal planning and prep routine that supports my fitness goals while being enjoyable and sustainable.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 4,
        inspiration: 6,
        tags: ['nutrition', 'meal-prep', 'planning']
      },
      {
        title: 'Track progress with measurements and photos',
        content: 'Establish consistent tracking system for weight, measurements, progress photos, and energy levels.',
        lane: 'current',
        priority: 'medium',
        energy_level: 'low',
        complexity: 'simple',
        effort: 1,
        inspiration: 5,
        tags: ['tracking', 'measurements', 'progress']
      },
      {
        title: 'Research and implement recovery strategies',
        content: 'Learn about sleep optimization, stretching, foam rolling, and other recovery methods to support training.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 3,
        inspiration: 7,
        tags: ['recovery', 'sleep', 'stretching']
      },
      {
        title: 'Find workout accountability partner',
        content: 'Connect with someone who can provide motivation, accountability, and make the fitness journey more enjoyable.',
        lane: 'next',
        priority: 'low',
        energy_level: 'medium',
        complexity: 'simple',
        effort: 2,
        inspiration: 8,
        tags: ['accountability', 'motivation', 'social']
      },
      {
        title: 'Fitness and nutrition knowledge base',
        content: 'Compile research, articles, and resources about effective training methods, nutrition science, and wellness practices.',
        lane: 'context',
        priority: 'low',
        energy_level: 'low',
        complexity: 'simple',
        effort: 2,
        inspiration: 4,
        tags: ['research', 'education', 'knowledge']
      }
    ]
  },
  {
    id: 'creative-project',
    name: 'Creative Portfolio Project',
    description: 'Build and showcase a compelling creative portfolio to attract dream clients or opportunities.',
    category: 'creative',
    icon: '🎨',
    color: 'pink',
    estimatedTimeWeeks: 10,
    blocks: [
      {
        title: 'Establish unique creative voice and style',
        content: 'Develop a distinctive creative identity that stands out in the market and authentically represents your artistic vision.',
        lane: 'vision',
        priority: 'high',
        energy_level: 'peak',
        complexity: 'complex',
        effort: 6,
        inspiration: 10,
        tags: ['identity', 'style', 'artistic-vision']
      },
      {
        title: 'Create portfolio that lands dream clients',
        content: 'Build a portfolio that showcases your best work and attracts the type of projects and clients you want to work with.',
        lane: 'goals',
        priority: 'urgent',
        energy_level: 'high',
        complexity: 'complex',
        effort: 8,
        inspiration: 9,
        tags: ['portfolio', 'client-attraction', 'showcase']
      },
      {
        title: 'Audit and select best existing work',
        content: 'Review all your previous projects and select 10-15 pieces that best demonstrate your skills and range.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 4,
        inspiration: 6,
        tags: ['curation', 'selection', 'quality-control']
      },
      {
        title: 'Create 3-5 new showcase pieces',
        content: 'Develop new creative work specifically for portfolio display that fills any gaps in your collection.',
        lane: 'current',
        priority: 'high',
        energy_level: 'peak',
        complexity: 'complex',
        effort: 25,
        inspiration: 9,
        tags: ['creation', 'showcase', 'portfolio-pieces']
      },
      {
        title: 'Design and build portfolio website',
        content: 'Create a beautiful, user-friendly website that presents your work professionally and tells your story effectively.',
        lane: 'current',
        priority: 'high',
        energy_level: 'high',
        complexity: 'complex',
        effort: 12,
        inspiration: 7,
        tags: ['website', 'design', 'presentation']
      },
      {
        title: 'Write compelling project case studies',
        content: 'Document the creative process, challenges, and solutions for your best projects to demonstrate strategic thinking.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 6,
        inspiration: 6,
        tags: ['case-studies', 'storytelling', 'process']
      },
      {
        title: 'Develop social media presence strategy',
        content: 'Plan how to share your work and creative process on social platforms to build audience and attract opportunities.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 4,
        inspiration: 7,
        tags: ['social-media', 'audience-building', 'exposure']
      },
      {
        title: 'Creative inspiration and reference library',
        content: 'Curate collection of inspiring work, color palettes, techniques, and references that fuel your creative process.',
        lane: 'context',
        priority: 'low',
        energy_level: 'low',
        complexity: 'simple',
        effort: 2,
        inspiration: 8,
        tags: ['inspiration', 'references', 'creative-fuel']
      }
    ]
  },
  {
    id: 'learning-project',
    name: 'Skill Mastery Learning Plan',
    description: 'Systematic approach to mastering a new skill with structured learning and practice milestones.',
    category: 'education',
    icon: '📚',
    color: 'yellow',
    estimatedTimeWeeks: 12,
    blocks: [
      {
        title: 'Become proficient in [new skill] for career growth',
        content: 'Master this skill to open new career opportunities, increase earning potential, and expand professional capabilities.',
        lane: 'vision',
        priority: 'high',
        energy_level: 'high',
        complexity: 'complex',
        effort: 4,
        inspiration: 9,
        tags: ['career-growth', 'skill-mastery', 'professional-development']
      },
      {
        title: 'Complete certification or build portfolio project',
        content: 'Achieve concrete milestone that demonstrates competency - either industry certification or significant portfolio project.',
        lane: 'goals',
        priority: 'high',
        energy_level: 'high',
        complexity: 'complex',
        effort: 10,
        inspiration: 8,
        tags: ['certification', 'portfolio', 'competency-proof']
      },
      {
        title: 'Create structured learning schedule',
        content: 'Design daily/weekly learning routine that fits your schedule and includes theory, practice, and review sessions.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 2,
        inspiration: 6,
        tags: ['schedule', 'routine', 'time-management']
      },
      {
        title: 'Complete foundational course or tutorials',
        content: 'Work through comprehensive course material or tutorial series to build solid understanding of core concepts.',
        lane: 'current',
        priority: 'urgent',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 20,
        inspiration: 7,
        tags: ['courses', 'tutorials', 'foundations']
      },
      {
        title: 'Practice with hands-on projects',
        content: 'Apply learning through practical projects that reinforce concepts and build real-world experience.',
        lane: 'current',
        priority: 'high',
        energy_level: 'high',
        complexity: 'moderate',
        effort: 15,
        inspiration: 8,
        tags: ['practice', 'projects', 'hands-on']
      },
      {
        title: 'Join community and find practice partners',
        content: 'Connect with others learning the same skill for support, accountability, and collaborative learning opportunities.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'simple',
        effort: 3,
        inspiration: 7,
        tags: ['community', 'networking', 'collaboration']
      },
      {
        title: 'Seek feedback from experts or mentors',
        content: 'Get guidance from experienced practitioners to identify improvement areas and accelerate learning progress.',
        lane: 'next',
        priority: 'medium',
        energy_level: 'medium',
        complexity: 'moderate',
        effort: 4,
        inspiration: 8,
        tags: ['feedback', 'mentorship', 'guidance']
      },
      {
        title: 'Learning resources and reference materials',
        content: 'Compile documentation, cheat sheets, best practices, and reference materials for ongoing skill development.',
        lane: 'context',
        priority: 'low',
        energy_level: 'low',
        complexity: 'simple',
        effort: 3,
        inspiration: 5,
        tags: ['resources', 'documentation', 'reference']
      }
    ]
  }
]

export function getTemplatesByCategory(category: ProjectTemplate['category']) {
  return projectTemplates.filter(template => template.category === category)
}

export function getTemplateById(id: string) {
  return projectTemplates.find(template => template.id === id)
}

export function getAllTemplates() {
  return projectTemplates
}

export const templateCategories = [
  { id: 'work', name: 'Work & Business', icon: '💼' },
  { id: 'startup', name: 'Startup & Tech', icon: '🚀' },
  { id: 'creative', name: 'Creative Projects', icon: '🎨' },
  { id: 'personal', name: 'Personal Goals', icon: '🌟' },
  { id: 'education', name: 'Learning & Skills', icon: '📚' }
] as const