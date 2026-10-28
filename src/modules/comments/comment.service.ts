/**
 * Gère les commentaires en vérifiant l'accès au projet et les droits
 * de l'auteur ou des responsables avant toute modification.
 */
import { AppError } from '../../utils/app-error';
import { MESSAGES } from '../../utils/constants';
import {
  PROJECT_MANAGER_ROLES,
  requireProjectAccess,
} from '../projects/project.service';
import { recordTicketHistoryEntries } from '../tickets/ticket-history.service';
import { requireTicketAccess } from '../tickets/ticket.service';
import { toUserSummary, UserModel, UserSummary } from '../users/user.model';
import {
  CommentDocument,
  CommentModel,
  PublicComment,
  toPublicComment,
} from './comment.model';
import { CreateCommentInput, UpdateCommentInput } from './comment.validation';

async function formatCommentsWithUsers(
  comments: CommentDocument[],
): Promise<PublicComment[]> {
  if (comments.length === 0) {
    return [];
  }

  const authorIds = Array.from(
    new Set(comments.map((comment) => comment.authorId.toString())),
  );

  const users = await UserModel.find({ _id: { $in: authorIds } });
  const usersById = new Map<string, UserSummary>(
    users.map((user) => [user._id.toString(), toUserSummary(user)]),
  );

  return comments.map((comment) => toPublicComment(comment, usersById));
}

export async function listTicketComments(
  ticketId: string,
  userId: string,
): Promise<PublicComment[]> {
  await requireTicketAccess(ticketId, userId);

  const comments = await CommentModel.find({ ticketId }).sort({ createdAt: 1 });
  return formatCommentsWithUsers(comments);
}

export async function createTicketComment(
  ticketId: string,
  userId: string,
  input: CreateCommentInput,
): Promise<PublicComment> {
  const { ticket, project } = await requireTicketAccess(ticketId, userId);

  const createdComment = await CommentModel.create({
    ticketId: ticket._id,
    projectId: project._id,
    authorId: userId,
    content: input.content,
  });

  await recordTicketHistoryEntries([
    {
      ticketId: ticket._id,
      projectId: project._id,
      actorId: userId,
      action: 'comment_added',
      field: 'comment',
      fromValue: null,
      toValue: createdComment._id.toString(),
      summary: `Commentaire ajouté sur ${ticket.key}`,
    },
  ]);

  const [formatted] = await formatCommentsWithUsers([createdComment]);
  return formatted;
}

export async function updateComment(
  commentId: string,
  userId: string,
  input: UpdateCommentInput,
): Promise<PublicComment> {
  const comment = await CommentModel.findById(commentId);
  if (!comment) {
    throw AppError.notFound(MESSAGES.COMMENTS.NOT_FOUND);
  }

  await requireProjectAccess(comment.projectId.toString(), userId);

  if (comment.authorId.toString() !== userId) {
    throw AppError.forbidden(MESSAGES.COMMENTS.EDIT_AUTHOR_ONLY);
  }

  if (comment.content !== input.content) {
    comment.content = input.content;
    comment.isEdited = true;
    await comment.save();
  }

  const [formatted] = await formatCommentsWithUsers([comment]);
  return formatted;
}

export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<void> {
  const comment = await CommentModel.findById(commentId);
  if (!comment) {
    throw AppError.notFound(MESSAGES.COMMENTS.NOT_FOUND);
  }

  const { membership } = await requireProjectAccess(
    comment.projectId.toString(),
    userId,
  );

  const isAuthor = comment.authorId.toString() === userId;
  const isManager = PROJECT_MANAGER_ROLES.includes(membership.role);

  if (!isAuthor && !isManager) {
    throw AppError.forbidden(MESSAGES.COMMENTS.DELETE_FORBIDDEN);
  }

  await CommentModel.findByIdAndDelete(commentId);
}
