import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { get } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';
import LoadingPage from '../components/LoadingPage';
import EditableSection from '../components/EditableSection';
import BioEditModal from '../components/profile/BioEditModal';
import SkillsEditModal from '../components/profile/SkillsEditModal';
import ExperienceEditModal from '../components/profile/ExperienceEditModal';
import CertificationEditModal from '../components/profile/CertificationEditModal';
import PortfolioEditModal from '../components/profile/PortfolioEditModal';
import AvatarEditModal from '../components/profile/AvatarEditModal';
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
  const [showCertificationsModal, setShowCertificationsModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username, id]);

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

  const isOwnProfile = currentUser && (currentUser.id === profile?.id || currentUser.username === profile?.username);

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

  const handleSaveExperience = async (experience) => {
    const result = await updateProfile({ ...profile, experience });
    if (result.success) {
      setProfile({ ...profile, experience });
      await fetchProfile();
      showSuccess('Experience updated successfully');
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleSaveCertifications = async (certifications) => {
    const result = await updateProfile({ ...profile, certifications });
    if (result.success) {
      setProfile({ ...profile, certifications });
      await fetchProfile();
      showSuccess('Certifications updated successfully');
    } else {
      showError(result.message);
      throw new Error(result.message);
    }
  };

  const handleSavePortfolio = async (portfolio) => {
    const result = await updateProfile({ ...profile, portfolio });
    if (result.success) {
      setProfile({ ...profile, portfolio });
      await fetchProfile();
      showSuccess('Portfolio updated successfully');
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
                    {profile.businessName && (
                      <p className="text-xl text-gray-600 mb-2">{profile.businessName}</p>
                    )}
                    {profile.trade && (
                      <p className="text-lg text-blue-600 font-medium">{profile.trade}</p>
                    )}
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

            {/* Experience */}
            <EditableSection
              title="Experience"
              icon={MdWork}
              isEmpty={!profile.experience || profile.experience.length === 0}
              isOwnProfile={isOwnProfile}
              onEdit={() => setShowExperienceModal(true)}
              onAdd={() => setShowExperienceModal(true)}
              emptyMessage="Add your first work experience"
            >
              <div className="space-y-6">
                {profile.experience?.map((exp, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 pb-4">
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
              onEdit={() => setShowCertificationsModal(true)}
              onAdd={() => setShowCertificationsModal(true)}
              emptyMessage="Add your first certification"
            >
              <div className="space-y-4">
                {profile.certifications?.map((cert, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
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
              onEdit={() => setShowPortfolioModal(true)}
              onAdd={() => setShowPortfolioModal(true)}
              emptyMessage="Add your first portfolio project"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.portfolio?.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    {item.imageUrl && (
                      <div className="h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${item.imageUrl}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                      )}
                      {item.projectLocation && (
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <MdLocationOn size={14} />
                          {item.projectLocation}
                        </p>
                      )}
                      {item.projectDate && (
                        <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                          <MdCalendarToday size={14} />
                          {formatDate(item.projectDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </EditableSection>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
      <ExperienceEditModal
        isOpen={showExperienceModal}
        onClose={() => setShowExperienceModal(false)}
        initialExperience={profile?.experience || []}
        onSave={handleSaveExperience}
      />
      <CertificationEditModal
        isOpen={showCertificationsModal}
        onClose={() => setShowCertificationsModal(false)}
        initialCertifications={profile?.certifications || []}
        onSave={handleSaveCertifications}
      />
      <PortfolioEditModal
        isOpen={showPortfolioModal}
        onClose={() => setShowPortfolioModal(false)}
        initialPortfolio={profile?.portfolio || []}
        onSave={handleSavePortfolio}
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
    </div>
  );
}

