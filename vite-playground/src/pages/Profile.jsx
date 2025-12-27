import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import LoadingPage from '../components/LoadingPage';
import EditableSection from '../components/EditableSection';
import BioEditModal from '../components/profile/BioEditModal';
import SkillsEditModal from '../components/profile/SkillsEditModal';
import ExperienceEntryModal from '../components/profile/ExperienceEntryModal';
import EducationEntryModal from '../components/profile/EducationEntryModal';
import CertificationEntryModal from '../components/profile/CertificationEntryModal';
import PortfolioEntryModal from '../components/profile/PortfolioEntryModal';
import AvatarEditModal from '../components/profile/AvatarEditModal';
import AnalyticsSection from '../components/profile/AnalyticsSection';
import PhotosGallery from '../components/profile/PhotosGallery';
import PhotoGalleryModal from '../components/profile/PhotoGalleryModal';
import PostForm from '../components/profile/PostForm';
import ActivityFeed from '../components/profile/ActivityFeed';
import { 
  MdEmail, MdPhone, MdLocationOn, MdBusiness, MdWork, MdSchool, 
  MdStar, MdLink, MdEdit, MdArrowBack, MdCheckCircle, MdCalendarToday,
  MdImage, MdCamera
} from 'react-icons/md';
import Button from '../components/Button';

export default function Profile() {
  const { username, id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateProfile, fetchUserProfile } = useAuth();
  const { showError, showSuccess } = useToast();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showBioModal, setShowBioModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState(null);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState(null);
  const [showCertificationsModal, setShowCertificationsModal] = useState(false);
  const [editingCertificationIndex, setEditingCertificationIndex] = useState(null);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPhotoGalleryModal, setShowPhotoGalleryModal] = useState(false);
  const [photoGalleryIndex, setPhotoGalleryIndex] = useState(0);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  // Calculate isOwnProfile - needs to be before useEffect that uses it
  const isOwnProfile = currentUser && profile && (currentUser.id === profile?.id || currentUser.username === profile?.username);

  useEffect(() => {
    fetchProfile();
  }, [username, id]);

  // Track profile view (only for non-owners) - use ref to prevent duplicate calls
  const hasTrackedView = useRef(new Set());
  useEffect(() => {
    // Only track once per profile load, and only if not own profile
    if (profile && !isOwnProfile && profile.id && !hasTrackedView.current.has(profile.id)) {
      hasTrackedView.current.add(profile.id);
      // Track view asynchronously without blocking
      fetch(API_ENDPOINTS.PROFILE.TRACK_VIEW(profile.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('Failed to track view:', err));
    }
  }, [profile?.id, isOwnProfile]);

  const fetchProfile = async () => {
    try {
      let url;
      if (id) {
        url = API_ENDPOINTS.PROFILE.GET_BY_ID(id);
      } else if (username) {
        url = API_ENDPOINTS.PROFILE.GET_BY_USERNAME(username);
      } else {
        showError('Invalid profile identifier');
        navigate('/');
        return;
      }

      const profileData = await get(url);
      setProfile(profileData);
    } catch (error) {
      showError(error.message || 'Failed to load profile');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  // Save handlers
  const handleSaveBio = async (bio) => {
    const result = await updateProfile({ ...profile, bio });
    if (result.success) {
      setProfile({ ...profile, bio });
      await fetchProfile(); // Refresh profile
      showSuccess('Bio updated successfully');
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleSaveSkills = async (skills) => {
    const result = await updateProfile({ ...profile, skills });
    if (result.success) {
      setProfile({ ...profile, skills });
      await fetchProfile();
      showSuccess('Skills updated successfully');
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  // Experience handlers
  const handleAddExperience = () => {
    setEditingExperienceIndex(null);
    setShowExperienceModal(true);
  };

  const handleEditExperience = (index) => {
    setEditingExperienceIndex(index);
    setShowExperienceModal(true);
  };

  const handleSaveExperience = async (experienceData) => {
    const currentExperience = profile.experience || [];
    let updatedExperience;
    
    if (editingExperienceIndex !== null) {
      // Update existing
      updatedExperience = [...currentExperience];
      updatedExperience[editingExperienceIndex] = experienceData;
    } else {
      // Add new
      updatedExperience = [...currentExperience, experienceData];
    }
    
    const result = await updateProfile({ ...profile, experience: updatedExperience });
    if (result.success) {
      setProfile({ ...profile, experience: updatedExperience });
      await fetchProfile();
      showSuccess(editingExperienceIndex !== null ? 'Experience updated successfully' : 'Experience added successfully');
      setShowExperienceModal(false);
      setEditingExperienceIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleDeleteExperience = async () => {
    const currentExperience = profile.experience || [];
    const updatedExperience = currentExperience.filter((_, i) => i !== editingExperienceIndex);
    
    const result = await updateProfile({ ...profile, experience: updatedExperience });
    if (result.success) {
      setProfile({ ...profile, experience: updatedExperience });
      await fetchProfile();
      showSuccess('Experience deleted successfully');
      setShowExperienceModal(false);
      setEditingExperienceIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  // Education handlers
  const handleAddEducation = () => {
    setEditingEducationIndex(null);
    setShowEducationModal(true);
  };

  const handleEditEducation = (index) => {
    setEditingEducationIndex(index);
    setShowEducationModal(true);
  };

  const handleSaveEducation = async (educationData) => {
    const currentEducation = profile.education || [];
    let updatedEducation;
    
    if (editingEducationIndex !== null) {
      updatedEducation = [...currentEducation];
      updatedEducation[editingEducationIndex] = educationData;
    } else {
      updatedEducation = [...currentEducation, educationData];
    }
    
    const result = await updateProfile({ ...profile, education: updatedEducation });
    if (result.success) {
      setProfile({ ...profile, education: updatedEducation });
      await fetchProfile();
      showSuccess(editingEducationIndex !== null ? 'Education updated successfully' : 'Education added successfully');
      setShowEducationModal(false);
      setEditingEducationIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleDeleteEducation = async () => {
    const currentEducation = profile.education || [];
    const updatedEducation = currentEducation.filter((_, i) => i !== editingEducationIndex);
    
    const result = await updateProfile({ ...profile, education: updatedEducation });
    if (result.success) {
      setProfile({ ...profile, education: updatedEducation });
      await fetchProfile();
      showSuccess('Education deleted successfully');
      setShowEducationModal(false);
      setEditingEducationIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  // Certification handlers
  const handleAddCertification = () => {
    setEditingCertificationIndex(null);
    setShowCertificationsModal(true);
  };

  const handleEditCertification = (index) => {
    setEditingCertificationIndex(index);
    setShowCertificationsModal(true);
  };

  const handleSaveCertification = async (certificationData) => {
    const currentCertifications = profile.certifications || [];
    let updatedCertifications;
    
    if (editingCertificationIndex !== null) {
      updatedCertifications = [...currentCertifications];
      updatedCertifications[editingCertificationIndex] = certificationData;
    } else {
      updatedCertifications = [...currentCertifications, certificationData];
    }
    
    const result = await updateProfile({ ...profile, certifications: updatedCertifications });
    if (result.success) {
      setProfile({ ...profile, certifications: updatedCertifications });
      await fetchProfile();
      showSuccess(editingCertificationIndex !== null ? 'Certification updated successfully' : 'Certification added successfully');
      setShowCertificationsModal(false);
      setEditingCertificationIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleDeleteCertification = async () => {
    const currentCertifications = profile.certifications || [];
    const updatedCertifications = currentCertifications.filter((_, i) => i !== editingCertificationIndex);
    
    const result = await updateProfile({ ...profile, certifications: updatedCertifications });
    if (result.success) {
      setProfile({ ...profile, certifications: updatedCertifications });
      await fetchProfile();
      showSuccess('Certification deleted successfully');
      setShowCertificationsModal(false);
      setEditingCertificationIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  // Portfolio handlers
  const handleAddPortfolio = () => {
    setEditingPortfolioIndex(null);
    setShowPortfolioModal(true);
  };

  const handleEditPortfolio = (index) => {
    setEditingPortfolioIndex(index);
    setShowPortfolioModal(true);
  };

  const handleSavePortfolio = async (portfolioData) => {
    const currentPortfolio = profile.portfolio || [];
    let updatedPortfolio;
    
    if (editingPortfolioIndex !== null) {
      updatedPortfolio = [...currentPortfolio];
      updatedPortfolio[editingPortfolioIndex] = portfolioData;
    } else {
      updatedPortfolio = [...currentPortfolio, portfolioData];
    }
    
    const result = await updateProfile({ ...profile, portfolio: updatedPortfolio });
    if (result.success) {
      setProfile({ ...profile, portfolio: updatedPortfolio });
      await fetchProfile();
      showSuccess(editingPortfolioIndex !== null ? 'Portfolio updated successfully' : 'Portfolio added successfully');
      setShowPortfolioModal(false);
      setEditingPortfolioIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleDeletePortfolio = async () => {
    const currentPortfolio = profile.portfolio || [];
    const updatedPortfolio = currentPortfolio.filter((_, i) => i !== editingPortfolioIndex);
    
    const result = await updateProfile({ ...profile, portfolio: updatedPortfolio });
    if (result.success) {
      setProfile({ ...profile, portfolio: updatedPortfolio });
      await fetchProfile();
      showSuccess('Portfolio deleted successfully');
      setShowPortfolioModal(false);
      setEditingPortfolioIndex(null);
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading profile..." />;
  }

  if (!profile) {
    return null;
  }

  const avatarUrl = profile.avatar 
    ? (profile.avatar.startsWith('http') ? profile.avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${profile.avatar}`)
    : null;

  const locationString = [
    profile.location?.city,
    profile.location?.state,
    profile.location?.country
  ].filter(Boolean).join(', ');

  // Extract all images from portfolio for photo gallery
  const getAllPortfolioImages = () => {
    const images = [];
    profile.portfolio?.forEach((item) => {
      if (item.images && Array.isArray(item.images)) {
        item.images.forEach((imageUrl) => {
          images.push({
            url: imageUrl,
            date: item.date ? new Date(item.date) : new Date(0),
            projectTitle: item.title || 'Untitled Project',
          });
        });
      }
    });
    // Sort by date (most recent first)
    return images.sort((a, b) => b.date - a.date);
  };

  const allPortfolioImages = getAllPortfolioImages();

  const handlePhotoClick = (index) => {
    setPhotoGalleryIndex(index);
    setShowPhotoGalleryModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 h-48 relative">
        <div className="container mx-auto px-4 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="text-white hover:text-gray-200 mb-4 flex items-center gap-2"
          >
            <MdArrowBack size={20} />
            Back
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header Card */}
        <div className="bg-white shadow-lg rounded-lg -mt-24 mb-6 relative">
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {isOwnProfile ? (
                  <div 
                    className="relative w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-blue-500 flex items-center justify-center text-white text-4xl font-semibold cursor-pointer group"
                    onClick={() => setShowAvatarModal(true)}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={`${profile.firstName} ${profile.lastName}`} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(profile.firstName, profile.lastName)
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <MdCamera size={32} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-blue-500 flex items-center justify-center text-white text-4xl font-semibold">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={`${profile.firstName} ${profile.lastName}`} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(profile.firstName, profile.lastName)
                    )}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    {(() => {
                      // Get current position from experience, or fall back to trade/businessName
                      const currentExperience = profile.experience?.find(exp => exp.isCurrent);
                      if (currentExperience && currentExperience.position && currentExperience.company) {
                        return (
                          <p className="text-xl text-gray-600 mb-2">
                            {currentExperience.position} at {currentExperience.company}
                          </p>
                        );
                      } else if (profile.trade && profile.businessName) {
                        return (
                          <p className="text-xl text-gray-600 mb-2">
                            {profile.trade} at {profile.businessName}
                          </p>
                        );
                      }
                      return null;
                    })()}
                    {locationString && (
                      <div className="flex items-center gap-2 text-gray-600 mt-2">
                        <MdLocationOn size={18} />
                        <span>{locationString}</span>
                      </div>
                    )}
                  </div>
                  {isOwnProfile && (
                    <Button
                      onClick={() => navigate('/settings')}
                      className="flex items-center gap-2"
                    >
                      <MdEdit size={18} />
                      Edit Profile
                    </Button>
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-gray-600">
                  {profile.phone && (
                    <a
                      href={`tel:${profile.phone}`}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdPhone size={18} />
                      <span>{profile.phone}</span>
                    </a>
                  )}
                  {profile.email && (
                    <a
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdEmail size={18} />
                      <span>{profile.email}</span>
                    </a>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdLink size={18} />
                      <span>Website</span>
                    </a>
                  )}
                  {/* Social Media */}
                  {profile.socialMedia?.linkedin && (
                    <a
                      href={profile.socialMedia.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdLink size={18} />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {profile.socialMedia?.facebook && (
                    <a
                      href={profile.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdLink size={18} />
                      <span>Facebook</span>
                    </a>
                  )}
                  {profile.socialMedia?.instagram && (
                    <a
                      href={profile.socialMedia.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdLink size={18} />
                      <span>Instagram</span>
                    </a>
                  )}
                  {profile.socialMedia?.twitter && (
                    <a
                      href={profile.socialMedia.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      <MdLink size={18} />
                      <span>Twitter</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post Form - Visible to owner and visitors (based on privacy) */}
            {(() => {
              const postsPrivacy = profile.privacySettings?.posts || 'public';
              // Show to owner always, or to visitors if privacy allows
              if (isOwnProfile) return true;
              if (postsPrivacy === 'private') return false;
              // For public, contacts_only, contacts_of_contacts - show to everyone (backend will validate)
              return true;
            })() && (
              <PostForm
                profileUserId={profile.id}
                onPostCreated={() => {
                  setPostsRefreshKey(prev => prev + 1);
                }}
                isOwnProfile={isOwnProfile}
              />
            )}

            {/* Bio */}
            <EditableSection
              title="About"
              isEmpty={!profile.bio}
              isOwnProfile={isOwnProfile}
              onEdit={() => setShowBioModal(true)}
              onAdd={() => setShowBioModal(true)}
              emptyMessage="Add your first about section"
            >
              <p className="text-gray-700 whitespace-pre-wrap break-words">{profile.bio}</p>
            </EditableSection>

            {/* Activity Feed */}
            <ActivityFeed
              key={postsRefreshKey}
              profileId={profile?.id}
              isOwnProfile={isOwnProfile}
              username={username || profile?.username}
              showViewAll={true}
              limit={3}
            />

            {/* Experience */}
            <EditableSection
              title="Experience"
              icon={MdWork}
              isEmpty={!profile.experience || profile.experience.length === 0}
              isOwnProfile={isOwnProfile}
              onEdit={handleAddExperience}
              onAdd={handleAddExperience}
              emptyMessage="Add your first work experience"
              emptyDescription="Showcase your accomplishments and get up to 2X as many profile views and connections"
              emptyPlaceholder={
                <div>
                  <p className="font-semibold text-gray-900">Job Title</p>
                  <p className="text-gray-600 text-sm">Organization</p>
                  <p className="text-gray-600 text-sm">2023 - present</p>
                </div>
              }
            >
              <div className="space-y-6">
                {profile.experience?.map((exp, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 pb-4 relative group">
                    {isOwnProfile && (
                      <button
                        onClick={() => handleEditExperience(index)}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                      >
                        <MdEdit size={18} />
                        Edit
                      </button>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{exp.position}</h3>
                        {exp.company && (
                          <p className="text-gray-700 font-medium">{exp.company}</p>
                        )}
                        {exp.location && (
                          <p className="text-gray-600 text-sm flex items-center gap-1 mt-1">
                            <MdLocationOn size={14} />
                            {exp.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <MdCalendarToday size={14} />
                      <span>
                        {exp.startDate ? formatDate(exp.startDate) : 'N/A'}
                        {' - '}
                        {exp.isCurrent ? (
                          <span className="text-blue-600 font-medium">Present</span>
                        ) : exp.endDate ? (
                          formatDate(exp.endDate)
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                    {exp.description && (
                      <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{exp.description}</p>
                    )}
                    {exp.duties && exp.duties.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Duties:</h4>
                        <div className="flex flex-wrap gap-2">
                          {exp.duties.map((duty, dutyIndex) => (
                            <span
                              key={dutyIndex}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                            >
                              {duty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </EditableSection>

            {/* Education */}
            <EditableSection
              title="Education"
              icon={MdSchool}
              isEmpty={!profile.education || profile.education.length === 0}
              isOwnProfile={isOwnProfile}
              onEdit={handleAddEducation}
              onAdd={handleAddEducation}
              emptyMessage="Add your first education"
              emptyDescription="Show your qualifications and be up to 2X more likely to receive a recruiter InMail"
              emptyPlaceholder={
                <div>
                  <p className="font-semibold text-gray-900">School</p>
                  <p className="text-gray-600 text-sm">Degree, Field of study</p>
                  <p className="text-gray-600 text-sm">2019 - 2023</p>
                </div>
              }
            >
              <div className="space-y-6">
                {profile.education?.map((edu, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 pb-4 relative group">
                    {isOwnProfile && (
                      <button
                        onClick={() => handleEditEducation(index)}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                      >
                        <MdEdit size={18} />
                        Edit
                      </button>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">{edu.school}</h3>
                        {(edu.degree || edu.fieldOfStudy) && (
                          <p className="text-gray-700 font-medium">
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {edu.grade && (
                          <p className="text-gray-600 text-sm mt-1">Grade: {edu.grade}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <MdCalendarToday size={14} />
                      <span>
                        {edu.startDate ? formatDate(edu.startDate) : 'N/A'}
                        {' - '}
                        {edu.isCurrent ? (
                          <span className="text-blue-600 font-medium">Present</span>
                        ) : edu.endDate ? (
                          formatDate(edu.endDate)
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                    {edu.description && (
                      <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </EditableSection>

            {/* Skills */}
            <EditableSection
              title="Skills"
              isEmpty={!profile.skills || profile.skills.length === 0}
              isOwnProfile={isOwnProfile}
              onEdit={() => setShowSkillsModal(true)}
              onAdd={() => setShowSkillsModal(true)}
              emptyMessage="Add your first skill"
            >
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((skill, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </EditableSection>

            {/* Certifications */}
            <EditableSection
              title="Certifications & Qualifications"
              icon={MdSchool}
              isEmpty={!profile.certifications || profile.certifications.length === 0}
              isOwnProfile={isOwnProfile}
              onEdit={handleAddCertification}
              onAdd={handleAddCertification}
              emptyMessage="Add your first certification"
            >
              <div className="space-y-4">
                {profile.certifications?.map((cert, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 relative group">
                    {isOwnProfile && (
                      <button
                        onClick={() => handleEditCertification(index)}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                      >
                        <MdEdit size={18} />
                        Edit
                      </button>
                    )}
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    {cert.issuer && (
                      <p className="text-gray-600 text-sm">Issued by: {cert.issuer}</p>
                    )}
                    {cert.credentialId && (
                      <p className="text-gray-600 text-sm">Credential ID: {cert.credentialId}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500 mt-2">
                      {cert.issueDate && (
                        <span>Issued: {formatDate(cert.issueDate)}</span>
                      )}
                      {(cert.expirationDate || cert.expiryDate) && (
                        <span>Expires: {formatDate(cert.expirationDate || cert.expiryDate)}</span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3">
                      {cert.pdfUrl && (
                        <a
                          href={cert.pdfUrl.startsWith('http') ? cert.pdfUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${cert.pdfUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <MdLink size={16} />
                          View PDF Certificate
                        </a>
                      )}
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <MdLink size={16} />
                          View Credential
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </EditableSection>

            {/* Portfolio */}
            <EditableSection
              title="Portfolio"
              icon={MdImage}
              isEmpty={!profile.portfolio || profile.portfolio.length === 0}
              isOwnProfile={isOwnProfile}
              onEdit={handleAddPortfolio}
              onAdd={handleAddPortfolio}
              emptyMessage="Add your first portfolio project"
            >
              <div className="space-y-6">
                {profile.portfolio?.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden bg-white relative group">
                    {isOwnProfile && (
                      <button
                        onClick={() => handleEditPortfolio(index)}
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded bg-white shadow flex items-center gap-1"
                      >
                        <MdEdit size={18} />
                        Edit
                      </button>
                    )}
                    {/* Image Gallery */}
                    {item.images && item.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-4 bg-gray-50">
                        {item.images.map((imageUrl, imgIndex) => {
                          const fullUrl = imageUrl.startsWith('http') 
                            ? imageUrl 
                            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${imageUrl}`;
                          return (
                            <div key={imgIndex} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                              <img
                                src={fullUrl}
                                alt={`${item.title} - Image ${imgIndex + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => {
                                  // Open image in lightbox/modal (simple window.open for now)
                                  window.open(fullUrl, '_blank');
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Project Details */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{item.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {item.location && (
                          <p className="flex items-center gap-1">
                            <MdLocationOn size={16} />
                            {item.location}
                          </p>
                        )}
                        {item.date && (
                          <p className="flex items-center gap-1">
                            <MdCalendarToday size={16} />
                            {formatDate(item.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </EditableSection>

            {/* Analytics - Only visible to owner, moved to bottom */}
            <AnalyticsSection profileId={profile?.id} isOwnProfile={isOwnProfile} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Photos Gallery */}
            <PhotosGallery
              allImages={allPortfolioImages}
              onImageClick={handlePhotoClick}
            />

            {/* Service Areas */}
            {profile.serviceAreas && profile.serviceAreas.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Service Areas</h3>
                <div className="space-y-2">
                  {profile.serviceAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-700">
                      <MdCheckCircle className="text-green-500" size={16} />
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* License Numbers */}
            {profile.licenseNumbers && profile.licenseNumbers.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Licenses</h3>
                <div className="space-y-2">
                  {profile.licenseNumbers.map((license, index) => (
                    <div key={index} className="text-gray-700 text-sm">
                      {license}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Member Since</h3>
              <p className="text-gray-600">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modals */}
      <BioEditModal
        isOpen={showBioModal}
        onClose={() => setShowBioModal(false)}
        initialBio={profile?.bio || ''}
        onSave={handleSaveBio}
      />
      <SkillsEditModal
        isOpen={showSkillsModal}
        onClose={() => setShowSkillsModal(false)}
        initialSkills={profile?.skills || []}
        onSave={handleSaveSkills}
      />
      <ExperienceEntryModal
        isOpen={showExperienceModal}
        onClose={() => {
          setShowExperienceModal(false);
          setEditingExperienceIndex(null);
        }}
        initialExperience={editingExperienceIndex !== null ? profile?.experience?.[editingExperienceIndex] : null}
        onSave={handleSaveExperience}
        onDelete={handleDeleteExperience}
      />
      <EducationEntryModal
        isOpen={showEducationModal}
        onClose={() => {
          setShowEducationModal(false);
          setEditingEducationIndex(null);
        }}
        initialEducation={editingEducationIndex !== null ? profile?.education?.[editingEducationIndex] : null}
        onSave={handleSaveEducation}
        onDelete={handleDeleteEducation}
      />
      <CertificationEntryModal
        isOpen={showCertificationsModal}
        onClose={() => {
          setShowCertificationsModal(false);
          setEditingCertificationIndex(null);
        }}
        initialCertification={editingCertificationIndex !== null ? profile?.certifications?.[editingCertificationIndex] : null}
        onSave={handleSaveCertification}
        onDelete={handleDeleteCertification}
      />
      <PortfolioEntryModal
        isOpen={showPortfolioModal}
        onClose={() => {
          setShowPortfolioModal(false);
          setEditingPortfolioIndex(null);
        }}
        initialPortfolio={editingPortfolioIndex !== null ? profile?.portfolio?.[editingPortfolioIndex] : null}
        onSave={handleSavePortfolio}
        onDelete={handleDeletePortfolio}
      />
      <AvatarEditModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        currentAvatar={avatarUrl}
        onSave={async (newAvatar) => {
          setProfile({ ...profile, avatar: newAvatar });
          await fetchProfile();
          await fetchUserProfile();
        }}
      />
      <PhotoGalleryModal
        isOpen={showPhotoGalleryModal}
        onClose={() => setShowPhotoGalleryModal(false)}
        images={allPortfolioImages}
        initialIndex={photoGalleryIndex}
      />
    </div>
  );
}

