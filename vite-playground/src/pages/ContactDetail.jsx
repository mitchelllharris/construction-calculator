import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { getContactById } from '../utils/contactApi';
import { getContactInteractions, createInteraction, updateInteraction, deleteInteraction } from '../utils/interactionApi';
import { MdArrowBack, MdEdit, MdDelete, MdEmail, MdPhone, MdLocationOn, MdBusiness, MdNotes, MdTag, MdAdd, MdCall, MdEvent, MdTask, MdCheckCircle, MdSchedule, MdCancel } from 'react-icons/md';
import Button from '../components/Button';
import LoadingPage from '../components/LoadingPage';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [contact, setContact] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'call',
    direction: 'outbound',
    subject: '',
    description: '',
    duration: '',
    date: new Date().toISOString().split('T')[0],
    status: 'completed'
  });

  useEffect(() => {
    fetchContact();
    fetchInteractions();
  }, [id]);

  const fetchContact = async () => {
    try {
      const contactData = await getContactById(id);
      setContact(contactData);
    } catch (error) {
      showError(error.message || 'Failed to load contact');
      navigate('/contacts');
    } finally {
      setLoading(false);
    }
  };

  const fetchInteractions = async () => {
    try {
      const interactionsData = await getContactInteractions(id);
      setInteractions(interactionsData);
    } catch (error) {
      console.error('Failed to load interactions:', error);
    }
  };

  const handleAddInteraction = () => {
    setEditingInteraction(null);
    setFormData({
      type: 'call',
      direction: 'outbound',
      subject: '',
      description: '',
      duration: '',
      date: new Date().toISOString().split('T')[0],
      status: 'completed'
    });
    setShowInteractionForm(true);
  };

  const handleEditInteraction = (interaction) => {
    setEditingInteraction(interaction);
    setFormData({
      type: interaction.type,
      direction: interaction.direction || 'outbound',
      subject: interaction.subject || '',
      description: interaction.description || '',
      duration: interaction.duration || '',
      date: interaction.date ? new Date(interaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: interaction.status || 'completed'
    });
    setShowInteractionForm(true);
  };

  const handleSubmitInteraction = async (e) => {
    e.preventDefault();
    try {
      const interactionData = {
        contactId: id,
        ...formData,
        duration: formData.duration ? parseInt(formData.duration) : undefined
      };

      if (editingInteraction) {
        await updateInteraction(editingInteraction._id, interactionData);
        showSuccess('Interaction updated successfully');
      } else {
        await createInteraction(interactionData);
        showSuccess('Interaction added successfully');
      }

      setShowInteractionForm(false);
      setEditingInteraction(null);
      fetchInteractions();
    } catch (error) {
      showError(error.message || 'Failed to save interaction');
    }
  };

  const handleDeleteInteraction = async (interactionId) => {
    if (!window.confirm('Are you sure you want to delete this interaction?')) return;
    
    try {
      await deleteInteraction(interactionId);
      showSuccess('Interaction deleted successfully');
      fetchInteractions();
    } catch (error) {
      showError(error.message || 'Failed to delete interaction');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'call': return <MdCall size={20} />;
      case 'email': return <MdEmail size={20} />;
      case 'meeting': return <MdEvent size={20} />;
      case 'task': return <MdTask size={20} />;
      case 'note': return <MdNotes size={20} />;
      default: return <MdNotes size={20} />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <MdCheckCircle className="text-green-500" size={18} />;
      case 'scheduled': return <MdSchedule className="text-blue-500" size={18} />;
      case 'pending': return <MdSchedule className="text-yellow-500" size={18} />;
      case 'cancelled': return <MdCancel className="text-red-500" size={18} />;
      default: return null;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      client: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      supplier: 'bg-green-100 text-green-800',
      contractor: 'bg-orange-100 text-orange-800',
    };
    return colors[contact?.type] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return `${first}${last}`;
  };

  const fullAddress = contact ? [
    contact.address,
    contact.city,
    contact.state,
    contact.zip,
    contact.country,
  ].filter(Boolean).join(', ') : '';

  const avatarUrl = contact?.avatar 
    ? (contact.avatar.startsWith('http') ? contact.avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${contact.avatar}`)
    : null;

  if (loading) {
    return <LoadingPage message="Loading contact..." />;
  }

  if (!contact) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/contacts')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          title="Back to contacts"
        >
          <MdArrowBack size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Contact Profile</h1>
        </div>
        <Button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-2"
        >
          <MdEdit size={20} />
          Edit Contact
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact Info */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 sticky top-4">
            {/* Avatar and Name */}
            <div className="text-center mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-center mb-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${contact.firstName} ${contact.lastName}`}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-blue-500 flex items-center justify-center text-white text-4xl font-semibold border-4 border-gray-200">
                    {getInitials(contact.firstName, contact.lastName)}
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {contact.firstName} {contact.lastName}
              </h2>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded ${getTypeColor(contact.type)}`}>
                {contact.type ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1) : 'Client'}
              </span>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 mb-6">
              {contact.email && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdEmail className="text-gray-400 flex-shrink-0" size={20} />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-blue-600 transition-colors break-all"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MdPhone className="text-gray-400 flex-shrink-0" size={20} />
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-blue-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {contact.phone}
                  </a>
                </div>
              )}

              {fullAddress && (
                <div className="flex items-start gap-3 text-gray-700">
                  <MdLocationOn className="text-gray-400 mt-0.5 flex-shrink-0" size={20} />
                  <span>{fullAddress}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MdTag className="text-gray-400" size={16} />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {contact.notes && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MdNotes className="text-gray-400" size={16} />
                  Notes
                </h4>
                <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {contact.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Interactions */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Interactions</h2>
              <Button
                onClick={handleAddInteraction}
                className="flex items-center gap-2"
              >
                <MdAdd size={20} />
                Add Interaction
              </Button>
            </div>

            {/* Interaction Form */}
            {showInteractionForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">
                  {editingInteraction ? 'Edit Interaction' : 'Add New Interaction'}
                </h3>
                <form onSubmit={handleSubmitInteraction} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        required
                      >
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="note">Note</option>
                        <option value="task">Task</option>
                      </select>
                    </div>

                    {(formData.type === 'call' || formData.type === 'email') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Direction *
                        </label>
                        <select
                          value={formData.direction}
                          onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                          className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                          required
                        >
                          <option value="inbound">Inbound</option>
                          <option value="outbound">Outbound</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                      >
                        <option value="completed">Completed</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    {(formData.type === 'call' || formData.type === 'meeting') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={formData.duration}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                          className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                          min="0"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                      placeholder="Enter subject..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                      rows={4}
                      placeholder="Enter description..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">
                      {editingInteraction ? 'Update' : 'Add'} Interaction
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInteractionForm(false);
                        setEditingInteraction(null);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Interactions List */}
            {interactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MdNotes size={48} className="mx-auto mb-4 text-gray-400" />
                <p>No interactions yet. Add one to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div
                    key={interaction._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(interaction.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 capitalize">
                              {interaction.type}
                              {interaction.direction && ` (${interaction.direction})`}
                            </span>
                            {getStatusIcon(interaction.status)}
                          </div>
                          {interaction.subject && (
                            <p className="text-sm text-gray-700 mt-1">{interaction.subject}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditInteraction(interaction)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <MdEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteInteraction(interaction._id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </div>
                    {interaction.description && (
                      <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                        {interaction.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{new Date(interaction.date).toLocaleDateString()}</span>
                      {interaction.duration && (
                        <span>Duration: {interaction.duration} min</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

