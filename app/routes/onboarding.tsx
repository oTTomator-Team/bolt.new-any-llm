import { useState } from 'react';
import { Link, useNavigate } from '@remix-run/react';
import { type MetaFunction } from '@remix-run/cloudflare';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt - Onboarding' }, { name: 'description', content: 'Get started with Bolt AI' }];
};

const OnboardingSteps = [
  {
    title: 'Welcome to Bolt AI',
    description: 'An intelligent assistant designed to help you solve complex problems and boost your productivity.',
    icon: '🚀'
  },
  {
    title: 'Multi-Model Support',
    description: 'Choose from a variety of AI models including OpenAI, Anthropic, Google, and more to suit your specific needs.',
    icon: '🤖'
  },
  {
    title: 'Code Intelligence',
    description: 'Get advanced code generation, understanding, and assistance across multiple programming languages.',
    icon: '💻'
  },
  {
    title: 'Contextual Understanding',
    description: 'Bolt AI understands context deeply, providing more accurate and relevant responses to your queries.',
    icon: '🧠'
  },
  {
    title: 'Seamless Workflow Integration',
    description: 'Easily integrate Bolt AI into your existing workflows and boost your productivity.',
    icon: '🔗'
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < OnboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/auth');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = OnboardingSteps[currentStep];

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <div className="container mx-auto px-4 py-16 text-center flex flex-col justify-center items-center h-full">
        <div className="max-w-2xl w-full bg-bolt-elements-background-depth-2 rounded-2xl p-8 shadow-2xl">
          <div className="text-6xl mb-6">{currentStepData.icon}</div>
          <h2 className="text-3xl font-bold text-white mb-4">{currentStepData.title}</h2>
          <p className="text-xl text-gray-300 mb-8">{currentStepData.description}</p>
          
          <div className="flex justify-center items-center space-x-4 mb-6">
            {OnboardingSteps.map((_, index) => (
              <div 
                key={index} 
                className={`h-2 w-2 rounded-full ${
                  index === currentStep 
                    ? 'bg-[#6E3BFF] w-6' 
                    : 'bg-gray-600'
                } transition-all duration-300`}
              />
            ))}
          </div>
          
          <div className="flex justify-center space-x-4">
            {currentStep > 0 && (
              <button 
                onClick={handlePrevious}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full"
              >
                Previous
              </button>
            )}
            <button 
              onClick={handleNext}
              className="bg-[#6E3BFF] hover:bg-[#5A2ECC] text-white font-bold py-2 px-6 rounded-full
              transition duration-300 ease-in-out transform hover:scale-105
              shadow-lg shadow-[#6E3BFF]/50 hover:shadow-[#6E3BFF]/70"
            >
              {currentStep < OnboardingSteps.length - 1 ? 'Next' : 'Start Chatting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
