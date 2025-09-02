import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';



// Glass Input Wrapper Component
const GlassInputWrapper = ({ children }) => (
  <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

// Testimonial Card Component
const TestimonialCard = ({ testimonial, delay }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-white/10 p-5 w-64`}>
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium text-gray-900">{testimonial.name}</p>
      <p className="text-gray-600">{testimonial.handle}</p>
      <p className="mt-1 text-gray-700">{testimonial.text}</p>
    </div>
  </div>
);

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await login(data.email, data.password);
    setIsLoading(false);
    
    if (result.success) {
      navigate('/');
    }
  };

  // Sample testimonials for the right side
  const testimonials = [
    {
      name: "Amit dubey",
      handle: "@amitdubey",
      text: "This platform has transformed how we manage our projects. Absolutely love it!"
    },
    {
      name: "Hari prasad",
      handle: "@hariprasad",
      text: "The interface is intuitive and the features are exactly what we needed."
    },
    {
      name: "Rajesh kumar",
      handle: "@rajeshkumar",
      text: "Best management tool we've used. Highly recommended!"
    }
  ];

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Left column: sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              <span className="font-light text-gray-900 tracking-tighter">Welcome</span>
            </h1>
            <p className="animate-element animate-delay-200 text-gray-600">
              Access your account and continue your journey with us
            </p>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <GlassInputWrapper>
                  <input 
                    name="email" 
                    type="email" 
                    placeholder="Enter your email address" 
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-500"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                  />
                </GlassInputWrapper>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Enter your password" 
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-500"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      })}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute inset-y-0 right-3 flex items-center"
                    >
                      {showPassword ? 
                        <EyeOff className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" /> : 
                        <Eye className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />
                      }
                    </button>
                  </div>
                </GlassInputWrapper>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-gray-700">Keep me signed in</span>
                </label>
                <Link to="/forgot-password" className="hover:underline text-gray-700 transition-colors">
                  Reset password
                </Link>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="animate-element animate-delay-600 w-full rounded-2xl bg-black hover:bg-gray-800 py-4 font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>



            <p className="text-center text-sm text-gray-600">
              New to our platform?{' '}
              <Link to="/register" className="text-gray-700 hover:underline transition-colors">
                Create Account
              </Link>
            </p>




          </div>
        </div>
      </section>

      {/* Right column: hero image + testimonials */}
      <section className="hidden md:block flex-1 relative p-4">
        <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center" 
             style={{ 
               backgroundImage: `url(/signinsidepic.png)`,
               backgroundSize: 'cover',
               backgroundPosition: 'center'
             }}>
        </div>
        {testimonials.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 px-8 w-full justify-center">
            <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
            {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" /></div>}
            {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" /></div>}
          </div>
        )}
      </section>
    </div>
  );
};

export default Login;