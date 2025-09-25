import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';

export function TaskComments({ comments = [], onAddComment, loading = false }) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e) => {
    e?.preventDefault();
    if (!newComment?.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Comments ({comments?.length || 0})
        </h2>
      </div>
      {/* Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e?.target?.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment?.trim() || isSubmitting}
            className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
      {/* Comments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading comments...</p>
          </div>
        ) : comments?.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No comments yet</p>
            <p className="text-sm text-gray-400">Be the first to add a comment</p>
          </div>
        ) : (
          comments?.map((comment) => (
            <div key={comment?.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {comment?.author?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(comment?.created_at)}
                    </p>
                  </div>
                  
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {comment?.content || ''}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Show More Comments (placeholder for pagination) */}
      {comments?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            All comments loaded
          </p>
        </div>
      )}
    </div>
  );
}