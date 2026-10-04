import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../shared/Button';
import { useSessionDispatch } from '../../orchestration/SessionContext';
import { createParticipant } from '../../api/participants';
import { createSession, completeStage } from '../../api/sessions';

const demographicsSchema = z.object({
  grade: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
  roll_no: z.string().min(1, "Roll number is required"),
  age: z.coerce.number().min(8, "Minimum age is 8").max(18, "Maximum age is 18"),
  gender: z.enum(["Male", "Female", "Prefer not to say"])
});

type DemographicsFormValues = z.infer<typeof demographicsSchema>;

const SECTIONS_BY_GRADE: Record<string, string[]> = {
  "Grade 5": ["BG G5 A11C", "BG G5 A11B", "BR G5 A31A", "BG G5 A11A"],
  "Grade 6": ["G6-A", "G6-B", "G6-C", "G6-D"],
  "Grade 7": ["G7-A", "G7-B", "G7-C", "G7-D"],
  "Grade 8": ["G8-A11A", "G8-A11B", "G8-A11D", "G8-A11C"]
};

export function DemographicsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setSession = useSessionDispatch();
  const name = location.state?.name || "Anonymous";
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<DemographicsFormValues>({
    resolver: zodResolver(demographicsSchema),
    defaultValues: {
      grade: "",
      section: "",
      roll_no: "",
      gender: "Prefer not to say"
    }
  });

  const selectedGrade = watch("grade");

  const onSubmit = async (data: DemographicsFormValues) => {
    setLoading(true);
    setApiError('');
    try {
      const participant = await createParticipant({
        name,
        age: data.age,
        gender: data.gender,
        grade: data.grade,
        section: data.section,
        roll_no: data.roll_no,
        consent: true
      });
      
      setSession({ participantId: participant.id, condition: participant.condition });

      const session = await createSession({ participant_id: participant.id });
      setSession({ sessionId: session.id, currentStage: session.current_stage });

      // Record consent stage completion
      await completeStage(session.id, { 
        stage_name: 'intake_consent', 
        payload: { consent: true } 
      });

      // Record demographics stage completion
      await completeStage(session.id, { 
        stage_name: 'demographics', 
        payload: { ...data } 
      });

      setSession({ currentStage: 'spatial_experience' });
      navigate('/experience');
    } catch (err: any) {
      setApiError(err.message || 'Failed to submit data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1.5rem' }}>Participant Details</h2>
      {apiError && <div style={{ color: 'var(--error)', marginBottom: '1rem' }}>{apiError}</div>}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Grade</label>
          <select {...register("grade")}>
            <option value="">Select Grade</option>
            {Object.keys(SECTIONS_BY_GRADE).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {errors.grade && <p className="error-text">{errors.grade.message}</p>}
        </div>

        <div className="form-group">
          <label>Section</label>
          <select {...register("section")} disabled={!selectedGrade}>
            <option value="">Select Section</option>
            {selectedGrade && SECTIONS_BY_GRADE[selectedGrade]?.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.section && <p className="error-text">{errors.section.message}</p>}
        </div>

        <div className="form-group">
          <label>Roll Number</label>
          <input type="text" {...register("roll_no")} placeholder="Enter roll number" />
          {errors.roll_no && <p className="error-text">{errors.roll_no.message}</p>}
        </div>

        <div className="form-group">
          <label>Age</label>
          <input type="number" {...register("age")} placeholder="Enter age (8-18)" />
          {errors.age && <p className="error-text">{errors.age.message}</p>}
        </div>

        <div className="form-group">
          <label>Gender</label>
          <select {...register("gender")}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          {errors.gender && <p className="error-text">{errors.gender.message}</p>}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Button type="submit" variant="primary" loading={loading}>
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}
