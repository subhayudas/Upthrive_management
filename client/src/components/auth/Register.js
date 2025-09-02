import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';



// Glass Input Wrapper Component
const GlassInputWrapper = ({ children }) => (
          <div className="rounded-2xl border border-gray-200/60 bg-white/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

// Testimonial Card Component
const TestimonialCard = ({ testimonial, delay }) => (
  <div className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-white/40 dark:bg-zinc-800/40 backdrop-blur-xl border border-gray-200/60 p-5 w-64`}>
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-medium text-gray-900">{testimonial.name}</p>
      <p className="text-gray-600">{testimonial.handle}</p>
      <p className="mt-1 text-gray-700">{testimonial.text}</p>
    </div>
  </div>
);

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await registerUser(data);
    setIsLoading(false);
    
    if (result.success) {
      navigate('/login');
    }
  };

  // Sample testimonials for the right side
  const testimonials = [
    {
      name: "Alex Rodriguez",
      handle: "@alexr",
      text: "The user experience is incredible. Everything is so intuitive and well-designed."
    },
    {
      name: "Lisa Wang",
      handle: "@lisaw",
      text: "The user experience is incredible. Everything is so intuitive and well-designed."
    },
    {
      name: "David Kim",
      handle: "@davidk",
      text: "Perfect for managing our creative projects. Highly recommend to anyone!"
    }
  ];

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Left column: sign-up form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              <span className="font-light text-gray-900 tracking-tighter">Join Us</span>
            </h1>
            <p className="animate-element animate-delay-200 text-gray-600">
              Create your account and start your journey with us today
            </p>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              {/* Name Field */}
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <GlassInputWrapper>
                  <input 
                    name="name" 
                    type="text" 
                    placeholder="Enter your full name" 
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-500"
                    {...register('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters'
                      }
                    })}
                  />
                </GlassInputWrapper>
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="animate-element animate-delay-400">
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

              {/* Phone Number Field */}
              <div className="animate-element animate-delay-500">
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <GlassInputWrapper>
                  <input 
                    name="phone" 
                    type="tel" 
                    placeholder="+1234567890" 
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-500"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^\+[1-9]\d{1,14}$/,
                        message: 'Please enter a valid phone number with country code (e.g., +1234567890)'
                      }
                    })}
                  />
                </GlassInputWrapper>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Include country code (e.g., +1 for US, +91 for India)
                </p>
              </div>

              {/* Role Field */}
              <div className="animate-element animate-delay-600">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <GlassInputWrapper>
                  <select 
                    name="role" 
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900"
                    {...register('role', {
                      required: 'Role is required'
                    })}
                  >
                    <option value="">Select your role</option>
                    <option value="client">Client</option>
                    <option value="manager">Manager</option>
                    <option value="editor">Editor</option>
                  </select>
                </GlassInputWrapper>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="animate-element animate-delay-700">
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

              {/* Confirm Password Field */}
              <div className="animate-element animate-delay-800">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <GlassInputWrapper>
                  <input 
                    name="confirmPassword" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Confirm your password" 
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none text-gray-900 placeholder-gray-500"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => value === password || 'Passwords do not match'
                    })}
                  />
                </GlassInputWrapper>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full rounded-2xl bg-black hover:bg-gray-800 py-4 font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>



            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-gray-700 hover:underline transition-colors">
                Sign In
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
            <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1300" />
            {testimonials[1] && <div className="hidden xl:flex"><TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1400" /></div>}
            {testimonials[2] && <div className="hidden 2xl:flex"><TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1500" /></div>}
          </div>
        )}
      </section>
    </div>
  );
};

export default Register;