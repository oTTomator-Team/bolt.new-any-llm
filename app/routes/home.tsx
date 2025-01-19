import { type MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt - Home' }, { name: 'description', content: 'Welcome to Bolt, your AI-powered assistant' }];
};

export default function Home() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <div className="container mx-auto px-4 py-16 text-center flex flex-col justify-center items-center h-full">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-4xl">
          Unlock Intelligent Assistance with Bolt AI
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
          Revolutionize your workflow with an AI assistant that understands context, 
          generates insights, and helps you solve complex problems across multiple domains.
        </p>
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-bolt-elements-background-depth-2 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Versatile AI</h2>
            <p className="text-gray-400">
              Support for multiple AI models including OpenAI, Anthropic, Google, and more.
            </p>
          </div>
          <div className="bg-bolt-elements-background-depth-2 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Code Intelligence</h2>
            <p className="text-gray-400">
              Advanced code understanding and generation across multiple programming languages.
            </p>
          </div>
          <div className="bg-bolt-elements-background-depth-2 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">Seamless Integration</h2>
            <p className="text-gray-400">
              Easily integrate Bolt into your workflow with our flexible, developer-friendly platform.
            </p>
          </div>
        </div>
        <Link 
          to="/onboarding" 
          className="bg-[#6E3BFF] hover:bg-[#5A2ECC] text-white font-bold py-3 px-8 rounded-full text-lg 
          transition duration-300 ease-in-out transform hover:scale-105 inline-block
          shadow-lg shadow-[#6E3BFF]/50 hover:shadow-[#6E3BFF]/70
          animate-pulse-glow"
        >
          Start Chatting
        </Link>
      </div>
    </div>
  );
}
