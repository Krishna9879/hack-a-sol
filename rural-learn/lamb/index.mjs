import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({ region: 'ap-south-1' });

export const handler = async (event) => {
  console.log('Lambda function invoked with event:', JSON.stringify(event, null, 2));
  
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const body = event.body;
    const path = event.rawPath || event.path || '/';
    
    console.log('HTTP Method:', method);
    console.log('Path:', path);
    console.log('Request Body:', body);
    
    if (method === 'POST') {
      if (!body) {
        console.log('No body provided');
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: 'Request body is required' })
        };
      }
      
      const requestData = JSON.parse(body);
      console.log('Parsed request data:', requestData);
      
      // Handle teacher registration
      if (requestData.action === 'register' || !requestData.action) {
        const params = {
          TableName: 'teacher',
          Item: {
            teacherEmail: requestData.email,
            firebaseUID: requestData.firebaseUID,
            name: requestData.name,
            schoolName: requestData.schoolName,
            classes: [],
            createdAt: new Date().toISOString()
          }
        };
        
        console.log('DynamoDB params:', JSON.stringify(params, null, 2));
        
        const result = await docClient.send(new PutCommand(params));
        console.log('DynamoDB result:', result);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'Teacher registered successfully', data: params.Item })
        };
      }
      
      // Handle class creation
      if (requestData.action === 'addClass') {
        const { teacherEmail, className } = requestData;
        
        // Get current teacher data
        const getParams = {
          TableName: 'teacher',
          Key: { teacherEmail }
        };
        
        const teacherResult = await docClient.send(new GetCommand(getParams));
        
        if (!teacherResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Teacher not found' })
          };
        }
        
        const currentClasses = teacherResult.Item.classes || [];
        const newClass = {
          id: `class_${Date.now()}`,
          name: className,
          createdAt: new Date().toISOString(),
          students: []
        };
        
        // Update teacher with new class
        const updateParams = {
          TableName: 'teacher',
          Key: { teacherEmail },
          UpdateExpression: 'SET classes = :classes',
          ExpressionAttributeValues: {
            ':classes': [...currentClasses, newClass]
          }
        };
        
        await docClient.send(new UpdateCommand(updateParams));
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'Class added successfully', class: newClass })
        };
      }
      
      // Handle add student
      if (requestData.action === 'addStudent') {
        const { teacherEmail, classId, studentEmail } = requestData;
        
        // Get current teacher data
        const getParams = {
          TableName: 'teacher',
          Key: { teacherEmail }
        };
        
        const teacherResult = await docClient.send(new GetCommand(getParams));
        
        if (!teacherResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Teacher not found' })
          };
        }
        
        const classes = teacherResult.Item.classes || [];
        const classIndex = classes.findIndex(c => c.id === classId);
        
        if (classIndex === -1) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Class not found' })
          };
        }
        
        // Check if student already exists
        if (classes[classIndex].students.includes(studentEmail)) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Student already in class' })
          };
        }
        
        // Generate student ID
        const studentID = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create student record in student table
        const studentParams = {
          TableName: 'student',
          Item: {
            studentID: studentID,
            email: studentEmail,
            teacherEmail: teacherEmail,
            classId: classId,
            className: classes[classIndex].name,
            createdAt: new Date().toISOString()
          }
        };
        
        await docClient.send(new PutCommand(studentParams));
        
        // Add student to class
        classes[classIndex].students.push(studentEmail);
        
        // Update teacher with modified classes
        const updateParams = {
          TableName: 'teacher',
          Key: { teacherEmail },
          UpdateExpression: 'SET classes = :classes',
          ExpressionAttributeValues: {
            ':classes': classes
          }
        };
        
        await docClient.send(new UpdateCommand(updateParams));
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            message: 'Student added successfully', 
            class: classes[classIndex],
            student: studentParams.Item
          })
        };
      }
      
      // Handle student verification
      if (requestData.action === 'verifyStudent') {
        const { studentEmail } = requestData;
        
        try {
          // Scan student table to find student by email
          const scanParams = {
            TableName: 'student',
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': studentEmail
            }
          };
          
          const result = await docClient.send(new ScanCommand(scanParams));
          
          if (result.Items && result.Items.length > 0) {
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                exists: true, 
                student: result.Items[0]
              })
            };
          } else {
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ 
                exists: false
              })
            };
          }
        } catch (error) {
          console.error('Error verifying student:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to verify student' })
          };
        }
      }
      
      // Handle chat messages
      if (requestData.action === 'chatMessage') {
        const { chatId, message, files, subjectId, subjectName } = requestData;
        
        try {
          // Store message in DynamoDB
          const messageParams = {
            TableName: 'chat',
            Item: {
              chatId: chatId,
              timestamp: new Date().toISOString(),
              messages: [
                {
                  role: 'user',
                  content: message,
                  files: files || [],
                  timestamp: new Date().toISOString()
                }
              ],
              subjectId: subjectId,
              subjectName: subjectName
            }
          };
          
          // Get existing chat or create new one
          const getParams = {
            TableName: 'chat',
            Key: { chatId }
          };
          
          const existingChat = await docClient.send(new GetCommand(getParams));
          
          if (existingChat.Item) {
            // Append to existing messages
            const updatedMessages = [...existingChat.Item.messages, {
              role: 'user',
              content: message,
              files: files || [],
              timestamp: new Date().toISOString()
            }];
            
            // Generate AI response using RAG data and conversation context
            const aiResponse = await generateAIResponse(message, subjectName, files, subjectId, existingChat.Item.messages);
            
            updatedMessages.push({
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date().toISOString()
            });
            
            const updateParams = {
              TableName: 'chat',
              Key: { chatId },
              UpdateExpression: 'SET messages = :messages, lastUpdated = :timestamp',
              ExpressionAttributeValues: {
                ':messages': updatedMessages,
                ':timestamp': new Date().toISOString()
              }
            };
            
            await docClient.send(new UpdateCommand(updateParams));
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ response: aiResponse })
            };
          } else {
            // Create new chat
            const aiResponse = await generateAIResponse(message, subjectName, files, subjectId, []);
            
            messageParams.Item.messages.push({
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date().toISOString()
            });
            
            await docClient.send(new PutCommand(messageParams));
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ response: aiResponse })
            };
          }
        } catch (error) {
          console.error('Error handling chat message:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to process message' })
          };
        }
      }
      
      // Handle get chat history
      if (requestData.action === 'getChatHistory') {
        const { chatId } = requestData;
        
        try {
          const getParams = {
            TableName: 'chat',
            Key: { chatId }
          };
          
          const result = await docClient.send(new GetCommand(getParams));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              messages: result.Item ? result.Item.messages : [] 
            })
          };
        } catch (error) {
          console.error('Error getting chat history:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to get chat history' })
          };
        }
      }
      
      // Handle get student subjects
      if (requestData.action === 'getStudentSubjects') {
        const { studentEmail } = requestData;
        
        try {
          // First get student info to find their class
          const studentScanParams = {
            TableName: 'student',
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: {
              ':email': studentEmail
            }
          };
          
          const studentResult = await docClient.send(new ScanCommand(studentScanParams));
          
          if (!studentResult.Items || studentResult.Items.length === 0) {
            return {
              statusCode: 404,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ error: 'Student not found' })
            };
          }
          
          const student = studentResult.Items[0];
          
          // Get subjects for the student's class
          const subjectScanParams = {
            TableName: 'subject',
            FilterExpression: 'classId = :classId',
            ExpressionAttributeValues: {
              ':classId': student.classId
            }
          };
          
          const subjectResult = await docClient.send(new ScanCommand(subjectScanParams));
          const subjects = subjectResult.Items || [];
          
          // Check for existing resources for each subject
          for (const subject of subjects) {
            try {
              // Check for quiz
              const quizParams = {
                TableName: 'quiz',
                Key: { quizId: subject.subjectId }
              };
              const quizResult = await docClient.send(new GetCommand(quizParams));
              subject.hasQuiz = !!quizResult.Item;
              
              // Check for flashcards
              const flashcardParams = {
                TableName: 'flashcard',
                Key: { cardId: subject.subjectId }
              };
              const flashcardResult = await docClient.send(new GetCommand(flashcardParams));
              subject.hasFlashcards = !!flashcardResult.Item;
              
              // Check for career path
              const careerParams = {
                TableName: 'career',
                Key: { crId: subject.subjectId }
              };
              const careerResult = await docClient.send(new GetCommand(careerParams));
              subject.hasCareerPath = !!careerResult.Item;
            } catch (error) {
              console.error('Error checking resources for subject:', subject.subjectId, error);
              subject.hasQuiz = false;
              subject.hasFlashcards = false;
              subject.hasCareerPath = false;
            }
          }
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              subjects: subjects,
              student: student
            })
          };
        } catch (error) {
          console.error('Error getting student subjects:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to get subjects' })
          };
        }
      }
      
      // Handle add subject
      if (requestData.action === 'addSubject') {
        const { teacherEmail, classId, subjectName, files } = requestData;
        
        // Generate subject ID
        const subjectId = `subject_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        let uploadedFiles = [];
        
        // Upload files to S3 and extract content if provided
        let allFileContents = [];
        
        if (files && files.length > 0) {
          for (const file of files) {
            const fileKey = `subjects/${subjectId}/${file.name}`;
            
            const uploadParams = {
              Bucket: 'setu-files-21e21e',
              Key: fileKey,
              Body: Buffer.from(file.content, 'base64'),
              ContentType: file.type
            };
            
            await s3Client.send(new PutObjectCommand(uploadParams));
            
            // Extract text content from file
            const extractedContent = await extractFileContent(file);
            if (extractedContent) {
              allFileContents.push({
                fileName: file.name,
                content: extractedContent
              });
            }
            
            uploadedFiles.push({
              name: file.name,
              key: fileKey,
              size: file.size,
              type: file.type,
              processed: true
            });
          }
        }
        
        // Generate RAG summary from all file contents
        let ragSummary = '';
        if (allFileContents.length > 0) {
          ragSummary = await generateRAGSummary(subjectName, allFileContents);
        }
        
        // Create subject record in subject table
        const subjectParams = {
          TableName: 'subject',
          Item: {
            subjectId: subjectId,
            name: subjectName,
            teacherEmail: teacherEmail,
            classId: classId,
            files: uploadedFiles,
            ragSummary: ragSummary,
            createdAt: new Date().toISOString()
          }
        };
        
        await docClient.send(new PutCommand(subjectParams));
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            message: 'Subject added successfully', 
            subject: subjectParams.Item
          })
        };
      }
      
      // Handle process existing files
      if (requestData.action === 'processExistingFiles') {
        const { subjectId } = requestData;
        
        // Get subject data
        const getParams = {
          TableName: 'subject',
          Key: { subjectId }
        };
        
        const subjectResult = await docClient.send(new GetCommand(getParams));
        
        if (!subjectResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Subject not found' })
          };
        }
        
        const subject = subjectResult.Item;
        const files = subject.files || [];
        let allFileContents = [];
        
        // Process unprocessed files
        for (const file of files) {
          if (!file.processed) {
            try {
              // Get file from S3 and extract content
              const s3Object = await s3Client.send(new GetObjectCommand({
                Bucket: 'setu-files-21e21e',
                Key: file.key
              }));
              
              const fileBuffer = await streamToBuffer(s3Object.Body);
              const extractedContent = await extractFileContentFromBuffer(fileBuffer, file.type, file.name);
              
              if (extractedContent) {
                allFileContents.push({
                  fileName: file.name,
                  content: extractedContent
                });
              }
              
              // Mark file as processed
              file.processed = true;
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
            }
          }
        }
        
        // Generate or update RAG summary
        let ragSummary = subject.ragSummary || '';
        if (allFileContents.length > 0) {
          ragSummary = await generateRAGSummary(subject.name, allFileContents);
        }
        
        // Update subject with processed files and summary
        const updateParams = {
          TableName: 'subject',
          Key: { subjectId },
          UpdateExpression: 'SET files = :files, ragSummary = :ragSummary',
          ExpressionAttributeValues: {
            ':files': files,
            ':ragSummary': ragSummary
          }
        };
        
        await docClient.send(new UpdateCommand(updateParams));
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            message: 'Files processed successfully',
            processedCount: allFileContents.length
          })
        };
      }
      
      // Handle delete subject
      if (requestData.action === 'deleteSubject') {
        const { subjectId } = requestData;
        
        const deleteParams = {
          TableName: 'subject',
          Key: { subjectId }
        };
        
        await docClient.send(new DeleteCommand(deleteParams));
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'Subject deleted successfully' })
        };
      }
      
      // Handle generate flashcards
      if (requestData.action === 'generateFlashcards') {
        const { subjectId } = requestData;
        
        try {
          const getParams = {
            TableName: 'subject',
            Key: { subjectId }
          };
          
          const subjectResult = await docClient.send(new GetCommand(getParams));
          
          if (!subjectResult.Item) {
            return {
              statusCode: 404,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ error: 'Subject not found' })
            };
          }
          
          const subject = subjectResult.Item;
          const flashcardData = await generateFlashcardsFromContent(subject.name, subject.ragSummary, subjectId);
          
          const flashcardParams = {
            TableName: 'flashcard',
            Item: {
              cardId: subjectId,
              subjectId: subjectId,
              ...flashcardData,
              createdAt: new Date().toISOString()
            }
          };
          
          await docClient.send(new PutCommand(flashcardParams));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Flashcards generated successfully', flashcards: flashcardParams.Item })
          };
        } catch (error) {
          console.error('Error generating flashcards:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to generate flashcards' })
          };
        }
      }
      
      // Handle generate career path
      if (requestData.action === 'generateCareerPath') {
        const { subjectId } = requestData;
        
        try {
          const getParams = {
            TableName: 'subject',
            Key: { subjectId }
          };
          
          const subjectResult = await docClient.send(new GetCommand(getParams));
          
          if (!subjectResult.Item) {
            return {
              statusCode: 404,
              headers: {
                'Content-Type': 'application/json'
            },
              body: JSON.stringify({ error: 'Subject not found' })
            };
          }
          
          const subject = subjectResult.Item;
          const careerData = await generateCareerPathFromContent(subject.name, subject.ragSummary, subjectId);
          
          const careerParams = {
            TableName: 'career',
            Item: {
              crId: subjectId,
              subjectId: subjectId,
              ...careerData,
              createdAt: new Date().toISOString()
            }
          };
          
          await docClient.send(new PutCommand(careerParams));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Career path generated successfully', career: careerParams.Item })
          };
        } catch (error) {
          console.error('Error generating career path:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to generate career path' })
          };
        }
      }
      
      // Handle generate quiz
      if (requestData.action === 'generateQuiz') {
        const { subjectId } = requestData;
        
        try {
          // Get subject data
          const getParams = {
            TableName: 'subject',
            Key: { subjectId }
          };
          
          const subjectResult = await docClient.send(new GetCommand(getParams));
          
          if (!subjectResult.Item) {
            return {
              statusCode: 404,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ error: 'Subject not found' })
            };
          }
          
          const subject = subjectResult.Item;
          
          // Generate quiz using AI
          const quizData = await generateQuizFromContent(subject.name, subject.ragSummary, subjectId);
          
          // Store quiz in DynamoDB
          const quizParams = {
            TableName: 'quiz',
            Item: {
              quizId: subjectId,
              subjectId: subjectId,
              ...quizData,
              createdAt: new Date().toISOString()
            }
          };
          
          await docClient.send(new PutCommand(quizParams));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Quiz generated successfully', quiz: quizParams.Item })
          };
        } catch (error) {
          console.error('Error generating quiz:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to generate quiz' })
          };
        }
      }
      
      // Handle emoji generation
      if (requestData.action === 'generateEmoji') {
        const { subjectName } = requestData;
        
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer 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',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'alibaba/tongyi-deepresearch-30b-a3b:free',
              messages: [{
                role: 'user',
                content: `Generate a single emoji that best represents the subject "${subjectName}". Respond with only the emoji, no text.`
              }],
              max_tokens: 10
            })
          });
          
          const aiResult = await response.json();
          const emoji = aiResult.choices?.[0]?.message?.content?.trim() || '📚';
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emoji })
          };
        } catch (error) {
          console.error('Error generating emoji:', error);
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emoji: '📚' })
          };
        }
      }
    }
    
    if (method === 'GET') {
      const queryParams = event.queryStringParameters || {};
      
      // Handle get classes
      if (queryParams.action === 'getClasses' && queryParams.teacherEmail) {
        const getParams = {
          TableName: 'teacher',
          Key: { teacherEmail: queryParams.teacherEmail }
        };
        
        const teacherResult = await docClient.send(new GetCommand(getParams));
        
        if (!teacherResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Teacher not found' })
          };
        }
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ classes: teacherResult.Item.classes || [] })
        };
      }
      
      // Handle get subjects
      if (queryParams.action === 'getSubjects' && queryParams.teacherEmail) {
        const scanParams = {
          TableName: 'subject',
          FilterExpression: 'teacherEmail = :teacherEmail',
          ExpressionAttributeValues: {
            ':teacherEmail': queryParams.teacherEmail
          }
        };
        
        const subjectResult = await docClient.send(new ScanCommand(scanParams));
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subjects: subjectResult.Items || [] })
        };
      }
      
      // Handle get quiz
      if (queryParams.action === 'getQuiz' && queryParams.quizId) {
        const getParams = {
          TableName: 'quiz',
          Key: { quizId: queryParams.quizId }
        };
        
        const quizResult = await docClient.send(new GetCommand(getParams));
        
        if (!quizResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Quiz not found' })
          };
        }
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ quiz: quizResult.Item })
        };
      }
      
      // Handle get flashcards
      if (queryParams.action === 'getFlashcards' && queryParams.cardId) {
        const getParams = {
          TableName: 'flashcard',
          Key: { cardId: queryParams.cardId }
        };
        
        const flashcardResult = await docClient.send(new GetCommand(getParams));
        
        if (!flashcardResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Flashcards not found' })
          };
        }
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ flashcards: flashcardResult.Item })
        };
      }
      
      // Handle get chat history
      if (queryParams.action === 'getChatHistory' && queryParams.chatId) {
        try {
          const getParams = {
            TableName: 'chat',
            Key: { chatId: queryParams.chatId }
          };
          
          const result = await docClient.send(new GetCommand(getParams));
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              messages: result.Item ? result.Item.messages : [] 
            })
          };
        } catch (error) {
          console.error('Error getting chat history:', error);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Failed to get chat history' })
          };
        }
      }
      
      // Handle get career path
      if (queryParams.action === 'getCareerPath' && queryParams.crId) {
        const getParams = {
          TableName: 'career',
          Key: { crId: queryParams.crId }
        };
        
        const careerResult = await docClient.send(new GetCommand(getParams));
        
        if (!careerResult.Item) {
          return {
            statusCode: 404,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Career path not found' })
          };
        }
        
        // Convert to career-data.json format with chapter ID as key
        const chapterId = careerResult.Item.chapterId;
        const careerData = {
          [chapterId]: {
            chapterId: careerResult.Item.chapterId,
            chapterName: careerResult.Item.chapterName,
            center: {
              title: careerResult.Item.center.title,
              x: parseInt(careerResult.Item.center.x),
              y: parseInt(careerResult.Item.center.y)
            },
            careers: careerResult.Item.careers.map(career => ({
              id: parseInt(career.id),
              title: career.title,
              x: parseInt(career.x),
              y: parseInt(career.y),
              salary: career.salary,
              education: career.education,
              description: career.description,
              skills: career.skills,
              pathway: career.pathway
            }))
          }
        };
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(careerData)
        };
      }
    }
    
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: ''
      };
    }
    
    console.log('Invalid request:', method);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Invalid request' })
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

// Extract text content from files
async function extractFileContent(file) {
  try {
    const fileBuffer = Buffer.from(file.content, 'base64');
    console.log(`Extracting content from ${file.name}, type: ${file.type}, size: ${fileBuffer.length}`);
    
    if (file.type === 'application/pdf') {
      // For PDF files - extract actual text content
      const pdfText = await extractPDFText(fileBuffer);
      console.log(`Extracted PDF text length: ${pdfText ? pdfText.length : 0}`);
      return pdfText;
    } else if (file.type.startsWith('text/')) {
      // For text files
      const textContent = fileBuffer.toString('utf-8');
      console.log(`Extracted text content length: ${textContent.length}`);
      return textContent;
    } else if (file.type.startsWith('image/')) {
      // For images, use OCR or return descriptive content
      return `Image file: ${file.name} - This image may contain educational diagrams, charts, formulas, or visual learning materials that support the subject content.`;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting file content:', error);
    return null;
  }
}

// Enhanced PDF text extraction with AI assistance
async function extractPDFText(buffer) {
  try {
    const pdfString = buffer.toString('latin1');
    let extractedText = '';
    
    // Method 1: Extract from BT...ET blocks (text objects)
    const textBlocks = pdfString.match(/BT[\s\S]*?ET/g);
    if (textBlocks) {
      for (const block of textBlocks) {
        const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
        if (tjMatches) {
          for (const match of tjMatches) {
            const text = match.match(/\(([^)]*)\)/)?.[1];
            if (text) {
              extractedText += decodeText(text) + ' ';
            }
          }
        }
      }
    }
    
    // Method 2: Extract form field values
    const formValues = pdfString.match(/\/V\(([^)]*)\)/g);
    if (formValues) {
      for (const value of formValues) {
        const text = value.match(/\/V\(([^)]*)\)/)?.[1];
        if (text && text.length > 2) {
          extractedText += decodeText(text) + ' ';
        }
      }
    }
    
    // Method 3: Extract all readable strings and let AI interpret
    const allStrings = [];
    const stringMatches = pdfString.match(/\(([^)]{2,})\)/g);
    if (stringMatches) {
      for (const match of stringMatches) {
        const text = match.match(/\(([^)]*)\)/)?.[1];
        if (text && /[a-zA-Z0-9]/.test(text)) {
          allStrings.push(decodeText(text));
        }
      }
    }
    
    // If we have some strings, combine them
    if (allStrings.length > 0) {
      extractedText += ' ' + allStrings.join(' ');
    }
    
    // Clean up
    extractedText = extractedText
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If we still don't have meaningful content, use AI to interpret the PDF structure
    if (!extractedText || extractedText.length < 50) {
      return await interpretPDFWithAI(buffer);
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return await interpretPDFWithAI(buffer);
  }
}

// Use AI to interpret PDF content when direct extraction fails
async function interpretPDFWithAI(buffer) {
  try {
    // Convert buffer to base64 for AI analysis
    const base64Content = buffer.toString('base64').substring(0, 8000); // Limit size
    
    const prompt = `This is a PDF file that I need to extract educational content from. The file appears to contain compressed or encoded content that standard text extraction cannot handle. 

Based on the PDF structure and any visible text patterns, please help me understand what educational content this document likely contains. Look for:
1. Any readable text strings
2. Form field values
3. Document metadata that might indicate the subject
4. Any patterns that suggest educational content

PDF data (first 8KB as base64): ${base64Content}

Please provide a reasonable interpretation of what educational content this PDF might contain, or indicate if it appears to be a form, worksheet, or other educational material. Focus on extracting any actual educational content you can identify.`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });
    
    const aiResult = await response.json();
    const interpretation = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (interpretation && interpretation.length > 100) {
      return interpretation;
    } else {
      return 'This appears to be a PDF document with educational content, but the specific text content could not be extracted due to encoding or compression. The document may contain forms, worksheets, or other educational materials that require specialized processing.';
    }
  } catch (error) {
    console.error('Error interpreting PDF with AI:', error);
    return 'PDF document uploaded - content extraction failed but document appears to contain educational material. Manual review may be needed to determine specific subject matter.';
  }
}

// Helper function to decode PDF text strings
function decodeText(text) {
  try {
    // Handle basic PDF string escapes
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\(\d{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
  } catch (error) {
    return text;
  }
}

// Convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Extract content from buffer
async function extractFileContentFromBuffer(buffer, fileType, fileName) {
  try {
    console.log(`Extracting content from buffer for ${fileName}, type: ${fileType}`);
    
    if (fileType === 'application/pdf') {
      const pdfText = await extractPDFText(buffer);
      console.log(`Extracted PDF text from buffer length: ${pdfText ? pdfText.length : 0}`);
      return pdfText;
    } else if (fileType.startsWith('text/')) {
      const textContent = buffer.toString('utf-8');
      console.log(`Extracted text content from buffer length: ${textContent.length}`);
      return textContent;
    } else if (fileType.startsWith('image/')) {
      return `Image file: ${fileName} - This image may contain educational diagrams, charts, formulas, or visual learning materials that support the subject content.`;
    }
    return null;
  } catch (error) {
    console.error('Error extracting content from buffer:', error);
    return null;
  }
}

// Generate quiz from subject content
async function generateQuizFromContent(subjectName, ragSummary, subjectId) {
  try {
    const prompt = `Create a comprehensive quiz for the subject "${subjectName}" based on the following content:

${ragSummary}

Generate exactly 20 multiple choice questions. Return ONLY valid JSON without any markdown formatting or extra text:

{
  "quizName": "${subjectName} Quiz",
  "timeAllowed": 30,
  "description": "Test your understanding of ${subjectName}",
  "totalQuestions": 20,
  "passingScore": 70,
  "questions": [
    {
      "id": 1,
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "difficulty": "easy"
    }
  ]
}`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 4000,
        temperature: 0.2
      })
    });
    
    const aiResult = await response.json();
    let quizContent = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (quizContent) {
      // Clean the response to ensure valid JSON
      quizContent = quizContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const quizData = JSON.parse(quizContent);
        // Ensure we have at least 20 questions
        if (quizData.questions && quizData.questions.length >= 20) {
          return quizData;
        } else {
          console.log('AI generated insufficient questions, using fallback');
          return generateFallbackQuiz(subjectName);
        }
      } catch (parseError) {
        console.error('Failed to parse AI quiz response:', parseError);
        console.log('Raw AI response:', quizContent);
        return generateFallbackQuiz(subjectName);
      }
    } else {
      return generateFallbackQuiz(subjectName);
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    return generateFallbackQuiz(subjectName);
  }
}

// Generate fallback quiz with 20 questions
function generateFallbackQuiz(subjectName) {
  const questions = [];
  const questionTemplates = [
    `What is a fundamental concept in ${subjectName}?`,
    `Which principle is important in ${subjectName}?`,
    `What characterizes ${subjectName}?`,
    `How does ${subjectName} apply in practice?`,
    `What is essential for understanding ${subjectName}?`,
    `Which factor is crucial in ${subjectName}?`,
    `What makes ${subjectName} significant?`,
    `How can you master ${subjectName}?`,
    `What is the foundation of ${subjectName}?`,
    `Which aspect defines ${subjectName}?`,
    `What drives progress in ${subjectName}?`,
    `How does ${subjectName} impact learning?`,
    `What skills are needed for ${subjectName}?`,
    `Which approach works best in ${subjectName}?`,
    `What challenges exist in ${subjectName}?`,
    `How can you excel in ${subjectName}?`,
    `What methods are effective in ${subjectName}?`,
    `Which strategies help with ${subjectName}?`,
    `What resources support ${subjectName} learning?`,
    `How can you apply ${subjectName} knowledge?`
  ];
  
  const difficulties = ['easy', 'medium', 'hard'];
  
  for (let i = 0; i < 20; i++) {
    questions.push({
      id: i + 1,
      text: questionTemplates[i],
      options: [
        "Theoretical understanding",
        "Practical application", 
        "Comprehensive study",
        "All of the above"
      ],
      correct: 3,
      difficulty: difficulties[i % 3]
    });
  }
  
  return {
    quizName: `${subjectName} Quiz`,
    timeAllowed: 30,
    description: `Test your understanding of ${subjectName}`,
    totalQuestions: 20,
    passingScore: 70,
    questions: questions
  };
}

// Generate flashcards from subject content
async function generateFlashcardsFromContent(subjectName, ragSummary, subjectId) {
  try {
    const prompt = `Create flashcards for the subject "${subjectName}" based on the following content:

${ragSummary}

Generate exactly 15 flashcards. Return ONLY valid JSON without any markdown formatting:

{
  "chapterId": "${subjectId}",
  "flashcards": [
    {
      "front": "Question or concept",
      "back": "Answer or explanation"
    }
  ]
}`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    const aiResult = await response.json();
    let flashcardContent = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (flashcardContent) {
      flashcardContent = flashcardContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const flashcardData = JSON.parse(flashcardContent);
        if (flashcardData.flashcards && flashcardData.flashcards.length >= 10) {
          return flashcardData;
        } else {
          return generateFallbackFlashcards(subjectName, subjectId);
        }
      } catch (parseError) {
        console.error('Failed to parse AI flashcard response:', parseError);
        return generateFallbackFlashcards(subjectName, subjectId);
      }
    } else {
      return generateFallbackFlashcards(subjectName, subjectId);
    }
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return generateFallbackFlashcards(subjectName, subjectId);
  }
}

// Generate fallback flashcards
function generateFallbackFlashcards(subjectName, subjectId) {
  const flashcards = [];
  const concepts = [
    'Basic principles', 'Key concepts', 'Important theories', 'Practical applications',
    'Core fundamentals', 'Essential knowledge', 'Critical understanding', 'Main ideas',
    'Fundamental laws', 'Primary concepts', 'Basic understanding', 'Key principles',
    'Important facts', 'Core theories', 'Essential principles'
  ];
  
  for (let i = 0; i < 15; i++) {
    flashcards.push({
      front: `What are the ${concepts[i]} in ${subjectName}?`,
      back: `The ${concepts[i]} in ${subjectName} form the foundation for understanding this subject and its practical applications.`
    });
  }
  
  return {
    chapterId: subjectId,
    flashcards: flashcards
  };
}

// Generate career path from subject content
async function generateCareerPathFromContent(subjectName, ragSummary, subjectId) {
  try {
    const prompt = `Create a career path guide for the subject "${subjectName}" based on the following content:

${ragSummary}

Generate exactly 6 careers in the format used by career visualization tools. Return ONLY valid JSON without any markdown formatting:

{
  "chapterId": "${subjectId}",
  "chapterName": "${subjectName}",
  "center": {
    "title": "${subjectName}",
    "x": 400,
    "y": 300
  },
  "careers": [
    {
      "id": 1,
      "title": "Career Title",
      "x": 200,
      "y": 200,
      "salary": "$60k-$100k",
      "education": "Bachelor's degree requirement",
      "description": "Brief career description",
      "skills": ["skill1", "skill2", "skill3", "skill4"],
      "pathway": ["step1", "step2", "step3", "step4"]
    }
  ]
}

Use these x,y coordinates for the 6 careers: (200,200), (600,200), (200,400), (600,400), (300,300), (500,300)`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    const aiResult = await response.json();
    let careerContent = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (careerContent) {
      careerContent = careerContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      try {
        const careerData = JSON.parse(careerContent);
        if (careerData.careers && careerData.careers.length >= 4) {
          return careerData;
        } else {
          return generateFallbackCareerPath(subjectName, subjectId);
        }
      } catch (parseError) {
        console.error('Failed to parse AI career response:', parseError);
        return generateFallbackCareerPath(subjectName, subjectId);
      }
    } else {
      return generateFallbackCareerPath(subjectName, subjectId);
    }
  } catch (error) {
    console.error('Error generating career path:', error);
    return generateFallbackCareerPath(subjectName, subjectId);
  }
}

// Generate fallback career path
function generateFallbackCareerPath(subjectName, subjectId) {
  return {
    chapterId: subjectId,
    chapterName: subjectName,
    center: {
      title: subjectName,
      x: 400,
      y: 300
    },
    careers: [
      {
        id: 1,
        title: `${subjectName} Specialist`,
        x: 200,
        y: 200,
        salary: '$60k-$100k',
        education: "Bachelor's degree in related field",
        description: `Work as a specialist in ${subjectName} with deep expertise and technical knowledge`,
        skills: ['Analytical thinking', 'Problem solving', 'Technical knowledge', 'Communication'],
        pathway: [
          "Complete Bachelor's degree in relevant field",
          "Gain practical experience through internships",
          "Develop specialized skills in " + subjectName,
          "Advance to senior specialist roles"
        ]
      },
      {
        id: 2,
        title: `${subjectName} Researcher`,
        x: 600,
        y: 200,
        salary: '$70k-$120k',
        education: "Master's or PhD preferred",
        description: `Conduct research and development in ${subjectName} to advance the field`,
        skills: ['Research methodology', 'Data analysis', 'Critical thinking', 'Scientific writing'],
        pathway: [
          "Complete advanced degree (Master's/PhD)",
          "Conduct original research projects",
          "Publish findings in academic journals",
          "Lead research teams and secure funding"
        ]
      },
      {
        id: 3,
        title: `${subjectName} Consultant`,
        x: 200,
        y: 400,
        salary: '$80k-$150k',
        education: "Bachelor's degree with experience",
        description: `Provide expert consulting services and solutions in ${subjectName}`,
        skills: ['Business acumen', 'Subject expertise', 'Client relations', 'Project management'],
        pathway: [
          "Build strong foundation in " + subjectName,
          "Gain industry experience and expertise",
          "Develop business and consulting skills",
          "Establish independent consulting practice"
        ]
      },
      {
        id: 4,
        title: `${subjectName} Engineer`,
        x: 600,
        y: 400,
        salary: '$75k-$130k',
        education: "Bachelor's in Engineering",
        description: `Apply ${subjectName} principles to design and develop engineering solutions`,
        skills: ['Engineering design', 'Technical analysis', 'CAD software', 'Project management'],
        pathway: [
          "Complete engineering degree program",
          "Gain hands-on engineering experience",
          "Obtain professional engineering license",
          "Lead complex engineering projects"
        ]
      },
      {
        id: 5,
        title: `${subjectName} Analyst`,
        x: 300,
        y: 300,
        salary: '$65k-$110k',
        education: "Bachelor's degree in relevant field",
        description: `Analyze data and systems related to ${subjectName} for optimization`,
        skills: ['Data analysis', 'Statistical methods', 'Software tools', 'Report writing'],
        pathway: [
          "Develop strong analytical skills",
          "Learn relevant software and tools",
          "Gain experience in data interpretation",
          "Advance to senior analyst positions"
        ]
      },
      {
        id: 6,
        title: `${subjectName} Manager`,
        x: 500,
        y: 300,
        salary: '$90k-$160k',
        education: "Bachelor's + Management experience",
        description: `Lead teams and projects in ${subjectName}-related organizations`,
        skills: ['Leadership', 'Strategic planning', 'Team management', 'Budget management'],
        pathway: [
          "Build technical expertise in " + subjectName,
          "Develop leadership and management skills",
          "Gain experience managing teams",
          "Advance to executive management roles"
        ]
      }
    ]
  };
}

// Generate RAG summary using OpenRouter AI
async function generateRAGSummary(subjectName, fileContents) {
  try {
    console.log(`Generating RAG summary for ${subjectName} with ${fileContents.length} files`);
    
    const combinedContent = fileContents.map(fc => {
      console.log(`File: ${fc.fileName}, Content length: ${fc.content ? fc.content.length : 0}`);
      return `=== FILE: ${fc.fileName} ===\n${fc.content}\n`;
    }).join('\n\n');
    
    console.log(`Total combined content length: ${combinedContent.length}`);
    
    const prompt = `You are an educational content analyzer. Create a comprehensive, detailed summary for the subject "${subjectName}" based on the actual content from the uploaded files below.

FILE CONTENTS:
${combinedContent}

Create a thorough educational summary (minimum 500 words) that includes:

1. **Subject Overview**: What this subject covers based on the actual file content
2. **Key Concepts**: Main topics, theories, and principles found in the materials
3. **Learning Objectives**: What students should learn from these materials
4. **Important Details**: Specific facts, formulas, definitions, or procedures mentioned
5. **Practical Applications**: Real-world uses and examples from the content
6. **Study Points**: Key areas students should focus on
7. **Content Structure**: How the material is organized and flows

Base your summary ONLY on the actual content provided in the files. Be specific and reference actual information from the materials. Make it comprehensive and educational for students.`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    const aiResult = await response.json();
    console.log('AI Response:', JSON.stringify(aiResult, null, 2));
    
    const summary = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (summary && summary.length > 100) {
      console.log(`Generated summary length: ${summary.length}`);
      return summary;
    } else {
      console.log('AI summary too short or empty, using fallback');
      return `Detailed analysis of ${subjectName} materials:\n\nThe uploaded files contain educational content covering various aspects of ${subjectName}. Based on the available materials, this subject encompasses important concepts and practical knowledge relevant to student learning. The content provides foundational understanding and practical applications that students can apply in their studies.\n\nKey areas covered include theoretical foundations, practical applications, and real-world examples that help students understand the subject matter comprehensively.`;
    }
  } catch (error) {
    console.error('Error generating RAG summary:', error);
    return `Comprehensive study materials for ${subjectName}:\n\nThe uploaded files contain educational resources that cover important aspects of this subject. Students will find valuable information including key concepts, practical examples, and learning materials that support their understanding of ${subjectName}.\n\nThese materials are designed to provide thorough coverage of the subject matter and help students achieve their learning objectives.`;
  }
}

// Enhanced AI Response Generation with conversational context and personalization
async function generateAIResponse(message, subjectName, files = [], subjectId, chatHistory = []) {
  try {
    // Get RAG context and chat history
    const ragContext = await getRagContext(subjectId);
    const conversationContext = buildConversationContext(chatHistory);
    const userProfile = analyzeUserLearningStyle(chatHistory);
    
    // Generate dynamic, contextual response using AI
    const response = await generateContextualAIResponse({
      message,
      subjectName,
      ragContext,
      conversationContext,
      userProfile,
      files
    });
    
    return response;
    
  } catch (error) {
    console.error('Error generating AI response:', error);
    return await generateFallbackResponse(message, subjectName);
  }
}

// Get comprehensive RAG context from database
async function getRagContext(subjectId) {
  try {
    const subjectParams = {
      TableName: 'subject',
      Key: { subjectId }
    };
    
    const subjectResult = await docClient.send(new GetCommand(subjectParams));
    return subjectResult.Item?.ragSummary || '';
  } catch (error) {
    console.error('Error getting RAG context:', error);
    return '';
  }
}

// Build conversation context from chat history
function buildConversationContext(chatHistory) {
  if (!chatHistory || chatHistory.length === 0) return '';
  
  // Get last 6 messages for context (3 exchanges)
  const recentMessages = chatHistory.slice(-6);
  
  return recentMessages.map(msg => {
    const role = msg.role === 'user' ? 'Student' : 'Assistant';
    return `${role}: ${msg.content}`;
  }).join('\n\n');
}

// Analyze user's learning style from chat history
function analyzeUserLearningStyle(chatHistory) {
  if (!chatHistory || chatHistory.length < 2) {
    return { style: 'adaptive', preferences: [] };
  }
  
  const userMessages = chatHistory.filter(msg => msg.role === 'user');
  const preferences = [];
  
  // Analyze question patterns
  const hasExampleRequests = userMessages.some(msg => 
    /example|show me|demonstrate|practical/i.test(msg.content)
  );
  if (hasExampleRequests) preferences.push('examples');
  
  const hasStepByStep = userMessages.some(msg => 
    /step|how to|process|explain/i.test(msg.content)
  );
  if (hasStepByStep) preferences.push('step-by-step');
  
  const hasConceptual = userMessages.some(msg => 
    /why|concept|theory|understand|meaning/i.test(msg.content)
  );
  if (hasConceptual) preferences.push('conceptual');
  
  const hasVisual = userMessages.some(msg => 
    /diagram|chart|visual|picture|image/i.test(msg.content)
  );
  if (hasVisual) preferences.push('visual');
  
  return {
    style: preferences.length > 0 ? 'personalized' : 'adaptive',
    preferences,
    messageCount: userMessages.length
  };
}

// Generate contextual AI response using external AI service
async function generateContextualAIResponse({ message, subjectName, ragContext, conversationContext, userProfile, files }) {
  try {
    const prompt = buildDynamicPrompt({
      message,
      subjectName,
      ragContext,
      conversationContext,
      userProfile,
      files
    });
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_tokens: 1500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });
    
    const aiResult = await response.json();
    let aiResponse = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      return await generateFallbackResponse(message, subjectName);
    }
    
    // Post-process response for better formatting
    aiResponse = enhanceResponseFormatting(aiResponse, userProfile, message);
    
    return aiResponse;
    
  } catch (error) {
    console.error('Error generating contextual AI response:', error);
    return await generateFallbackResponse(message, subjectName);
  }
}

// Build dynamic prompt based on context and user profile
function buildDynamicPrompt({ message, subjectName, ragContext, conversationContext, userProfile, files }) {
  const sentiment = analyzeMessageSentiment(message);
  
  let prompt = `You are an intelligent, friendly, and adaptive learning assistant for ${subjectName}. You have access to the student's course materials and conversation history. Your goal is to provide personalized, engaging, and helpful responses that feel natural and conversational like ChatGPT.\n\n`;
  
  // Add course materials context
  if (ragContext) {
    prompt += `COURSE MATERIALS CONTEXT:\n${ragContext}\n\n`;
  }
  
  // Add conversation history
  if (conversationContext) {
    prompt += `CONVERSATION HISTORY:\n${conversationContext}\n\n`;
  }
  
  // Add user profile insights
  if (userProfile.preferences.length > 0) {
    prompt += `STUDENT LEARNING PREFERENCES: This student prefers ${userProfile.preferences.join(', ')} in explanations.\n\n`;
  }
  
  // Add sentiment analysis
  if (sentiment.needsEncouragement) {
    prompt += `STUDENT MOOD: The student seems to be struggling or confused. Be extra supportive and encouraging.\n\n`;
  } else if (sentiment.sentiment === 'positive') {
    prompt += `STUDENT MOOD: The student seems engaged and positive. Build on this enthusiasm.\n\n`;
  }
  
  // Add file context
  if (files && files.length > 0) {
    prompt += `FILES UPLOADED: Student has uploaded ${files.length} file(s) for analysis.\n\n`;
  }
  
  prompt += `INSTRUCTIONS:\n`;
  prompt += `- Be conversational, friendly, and engaging like ChatGPT\n`;
  prompt += `- Use the course materials as your primary knowledge source but feel free to expand beyond them\n`;
  prompt += `- Adapt your explanation style to the student's preferences and emotional state\n`;
  prompt += `- Reference previous conversation when relevant to show continuity\n`;
  prompt += `- Use emojis and formatting to make responses engaging and readable\n`;
  prompt += `- Ask thoughtful follow-up questions to encourage deeper learning\n`;
  prompt += `- Be encouraging and supportive, especially if the student seems confused\n`;
  prompt += `- Provide practical examples and real-world connections when possible\n`;
  prompt += `- Keep responses conversational but informative (aim for 200-400 words)\n\n`;
  
  prompt += `CURRENT STUDENT MESSAGE: "${message}"\n\n`;
  prompt += `Please provide a helpful, personalized response that addresses their question while maintaining an engaging, ChatGPT-like conversational tone:`;
  
  return prompt;
}

// Enhance response formatting based on user preferences and context
function enhanceResponseFormatting(response, userProfile, message = '') {
  const sentiment = analyzeMessageSentiment(message);
  
  // Add interactive elements based on preferences
  if (userProfile.preferences.includes('examples') && !response.toLowerCase().includes('example')) {
    response += '\n\n💡 Would you like me to provide a specific example to illustrate this concept?';
  }
  
  if (userProfile.preferences.includes('step-by-step') && !response.toLowerCase().includes('step')) {
    response += '\n\n📋 Need me to break this down into step-by-step instructions?';
  }
  
  if (userProfile.preferences.includes('visual') && !response.toLowerCase().includes('visual')) {
    response += '\n\n🎨 Would a diagram or visual representation help clarify this?';
  }
  
  // Add contextual follow-ups
  if (sentiment.needsEncouragement) {
    response += '\n\n😊 Don\'t worry if this seems complex at first - you\'re doing great! Feel free to ask me to explain anything differently.';
  } else if (sentiment.isInquisitive) {
    response += '\n\n🤔 I love your curiosity! What other aspects of this topic interest you?';
  }
  
  // Add encouraging follow-up based on conversation length
  if (userProfile.messageCount > 5) {
    response += '\n\n🌟 You\'re really diving deep into this subject! Your questions show great critical thinking.';
  } else if (userProfile.messageCount > 2) {
    response += '\n\n🚀 Keep the questions coming - you\'re building a solid understanding!';
  }
  
  return response;
}

// Generate fallback response when AI fails
async function generateFallbackResponse(message, subjectName) {
  const sentiment = analyzeMessageSentiment(message);
  
  let fallbacks;
  
  if (sentiment.needsEncouragement) {
    fallbacks = [
      `I understand ${subjectName} can be challenging sometimes! 😊 Let me help you work through this. Could you tell me which specific part is giving you trouble?`,
      `No worries - we'll figure this out together! For ${subjectName}, it often helps to break things down. What specific aspect would you like me to explain differently?`,
      `I'm here to support your learning in ${subjectName}! 💪 Sometimes a different approach helps. What would make this clearer for you?`
    ];
  } else if (sentiment.isInquisitive) {
    fallbacks = [
      `Great question about ${subjectName}! 🤔 I love your curiosity. Could you give me a bit more context about what specifically interests you?`,
      `That's a thoughtful question! For ${subjectName}, there are several angles we could explore. What aspect would be most helpful for your understanding?`,
      `Excellent inquiry! 🌟 Let me make sure I address exactly what you're looking for in ${subjectName}. Could you elaborate on your question?`
    ];
  } else {
    fallbacks = [
      `That's an interesting question about ${subjectName}! Let me make sure I understand what you're looking for. Could you provide a bit more detail?`,
      `I want to give you the most helpful answer for ${subjectName}. Could you rephrase your question or let me know what specific aspect you're curious about?`,
      `Good question! For ${subjectName}, there are several ways to approach this. What would be most useful - a general overview or something more specific?`,
      `I'm here to help you succeed in ${subjectName}! 🚀 Could you tell me more about what you're trying to understand?`
    ];
  }
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Check if question is general (not subject-specific)
function isGeneralQuestion(message) {
  const generalPatterns = [
    /who are you/i,
    /what are you/i,
    /hello/i,
    /hi/i,
    /help/i,
    /^\d+\s*[+\-*/]\s*\d+/,
    /what.*this.*about/i,
    /introduce/i
  ];
  
  return generalPatterns.some(pattern => pattern.test(message));
}

// Handle general questions
function handleGeneralQuestion(message, subjectName) {
  if (/who are you|what are you/i.test(message)) {
    return `Hi! I'm your AI learning assistant for **${subjectName}**. I can help you:\n\n• Understand key concepts\n• Solve problems step-by-step\n• Provide examples and explanations\n• Answer questions about your study materials\n\nWhat would you like to learn about today?`;
  }
  
  if (/hello|hi/i.test(message)) {
    return `Hello! 👋 Ready to dive into **${subjectName}**? I'm here to help you understand the concepts and answer any questions you have about your study materials.`;
  }
  
  if (/^\d+\s*[+\-*/]\s*\d+/.test(message)) {
    try {
      const result = eval(message.replace(/[^0-9+\-*/.() ]/g, ''));
      return `The answer is **${result}**\n\nBut let's focus on ${subjectName}! Do you have any questions about the course material?`;
    } catch {
      return `I can help with basic math, but I'm specialized in **${subjectName}**. What would you like to learn about the subject?`;
    }
  }
  
  if (/what.*this.*about/i.test(message)) {
    return `This is your **${subjectName}** learning assistant! I can help you understand the course materials, explain concepts, and answer questions. What specific topic would you like to explore?`;
  }
  
  return `I'm your ${subjectName} learning assistant. How can I help you today?`;
}

// Get Wikipedia data for external context
async function getWikipediaData(topic) {
  return new Promise((resolve) => {
    const https = require('https');
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.extract || '');
        } catch { resolve(''); }
      });
    }).on('error', () => resolve(''));
  });
}

// Generate enhanced interactive responses with external data
function generateEnhancedResponse(message, subjectName, relevantContent, externalData, keywords) {
  const msg = message.toLowerCase();
  const greetings = [
    "Great question! Let me help you understand this better.",
    "I'd be happy to explain that for you!",
    "That's an interesting topic to explore.",
    "Let me break this down for you clearly."
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  let response = `${greeting}\n\n`;
  
  // Add course materials if available
  if (relevantContent) {
    response += `## 📚 From Your Course Materials\n\n${relevantContent}\n\n`;
  }
  
  // Add external knowledge
  if (externalData) {
    response += `## 🌐 Additional Context\n\n${externalData}\n\n`;
  }
  
  // Question-specific responses
  if (msg.includes('what is') || msg.includes('whats')) {
    const topic = keywords[0] || 'this concept';
    response += `### 🔍 Understanding ${topic}\n\nThis is a fundamental concept that plays a crucial role in ${subjectName}. Think of it as a building block that connects to many other important ideas in the field.`;
  } else if (msg.includes('explain')) {
    response += `### 📖 Step-by-Step Explanation\n\n1. **Foundation**: We start with the core principles\n2. **Mechanism**: How the process actually works\n3. **Application**: Real-world uses and examples\n4. **Significance**: Why this matters in the bigger picture`;
  } else if (msg.includes('example') || msg.includes('practical')) {
    response += `### 💡 Practical Applications\n\nHere are some real-world examples that show how this concept is used:\n\n• **Industry Applications**: How professionals use this daily\n• **Research Context**: Current developments and discoveries\n• **Problem-Solving**: Practical ways to apply this knowledge`;
  } else {
    response += `### 🎯 Key Insights\n\nThis topic is important because it helps you understand how different concepts in ${subjectName} work together. It's one of those foundational ideas that opens doors to deeper learning.`;
  }
  
  // Interactive follow-up
  response += `\n\n## 🤔 Want to explore more?\n\n• Ask for **specific examples**\n• Request **step-by-step breakdowns**\n• Explore **related concepts**\n• Try **practice problems**\n\n*I'm here to help you master ${subjectName}! What would you like to dive into next?* 😊`;
  
  return response;
}

// Enhanced keyword extraction with semantic understanding
function extractKeywords(message) {
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'will', 'be', 'can', 'you', 'me', 'i', 'my', 'this', 'that', 'what', 'how', 'why', 'when', 'where'];
  
  // Extract meaningful words and phrases
  const words = message.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // Look for important phrases and technical terms
  const phrases = [];
  const text = message.toLowerCase();
  
  // Common academic phrases
  const academicPatterns = [
    /\b(\w+)\s+theory\b/g,
    /\b(\w+)\s+principle\b/g,
    /\b(\w+)\s+method\b/g,
    /\b(\w+)\s+process\b/g,
    /\b(\w+)\s+concept\b/g
  ];
  
  academicPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      phrases.push(match[1]);
    }
  });
  
  return [...new Set([...phrases, ...words.slice(0, 5)])];
}

// Smart content relevance scoring
function findRelevantContent(ragSummary, keywords) {
  if (!ragSummary || keywords.length === 0) return '';
  
  const sentences = ragSummary.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  const scoredSentences = sentences.map(sentence => {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Exact match gets highest score
      if (lowerSentence.includes(keywordLower)) {
        score += 3;
      }
      
      // Partial match gets medium score
      if (keywordLower.length > 4 && lowerSentence.includes(keywordLower.substring(0, 4))) {
        score += 1;
      }
      
      // Related terms get bonus points
      const relatedTerms = getRelatedTerms(keywordLower);
      relatedTerms.forEach(term => {
        if (lowerSentence.includes(term)) {
          score += 2;
        }
      });
    });
    
    return { sentence: sentence.trim(), score };
  });
  
  const relevant = scoredSentences
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.sentence)
    .join('. ');
  
  return relevant || sentences.slice(0, 3).join('. ').trim();
}

// Get related terms for better context matching
function getRelatedTerms(keyword) {
  const termMap = {
    'dna': ['genetic', 'gene', 'chromosome', 'nucleotide', 'sequence'],
    'protein': ['amino', 'enzyme', 'structure', 'function', 'synthesis'],
    'cell': ['membrane', 'nucleus', 'organelle', 'cytoplasm', 'division'],
    'energy': ['atp', 'metabolism', 'respiration', 'photosynthesis', 'mitochondria'],
    'evolution': ['natural selection', 'adaptation', 'species', 'darwin', 'mutation'],
    'chemistry': ['molecule', 'atom', 'bond', 'reaction', 'element'],
    'physics': ['force', 'energy', 'motion', 'wave', 'particle'],
    'math': ['equation', 'formula', 'calculation', 'number', 'function'],
    'history': ['event', 'period', 'civilization', 'culture', 'timeline'],
    'literature': ['author', 'character', 'theme', 'plot', 'analysis']
  };
  
  return termMap[keyword] || [];
}

// Store and retrieve user conversation preferences
async function updateUserPreferences(chatId, preferences) {
  try {
    const params = {
      TableName: 'user_preferences',
      Item: {
        chatId,
        preferences,
        lastUpdated: new Date().toISOString()
      }
    };
    
    await docClient.send(new PutCommand(params));
  } catch (error) {
    console.error('Error updating user preferences:', error);
  }
}

// Get user preferences for personalization
async function getUserPreferences(chatId) {
  try {
    const params = {
      TableName: 'user_preferences',
      Key: { chatId }
    };
    
    const result = await docClient.send(new GetCommand(params));
    return result.Item?.preferences || { style: 'adaptive', preferences: [] };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { style: 'adaptive', preferences: [] };
  }
}

// Analyze message sentiment and engagement level
function analyzeMessageSentiment(message) {
  const positiveWords = ['great', 'awesome', 'excellent', 'perfect', 'amazing', 'love', 'like', 'good', 'helpful', 'clear', 'understand'];
  const negativeWords = ['confused', 'difficult', 'hard', 'dont understand', 'unclear', 'complicated', 'frustrated', 'stuck'];
  const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'can you', 'could you', 'explain', 'help'];
  
  const lowerMessage = message.toLowerCase();
  
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  const questionCount = questionWords.filter(word => lowerMessage.includes(word)).length;
  
  return {
    sentiment: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral',
    engagement: questionCount > 2 ? 'high' : questionCount > 0 ? 'medium' : 'low',
    needsEncouragement: negativeCount > 1,
    isInquisitive: questionCount > 1
  };
}

// Generate contextual follow-up questions
function generateFollowUpQuestions(message, subjectName, userProfile) {
  const followUps = [];
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('what is') || lowerMessage.includes('define')) {
    followUps.push(`Would you like to see how ${extractMainTopic(message)} applies in real-world scenarios?`);
    followUps.push(`Are there any specific aspects of this concept you'd like me to elaborate on?`);
  }
  
  if (lowerMessage.includes('how') || lowerMessage.includes('process')) {
    followUps.push(`Would you like me to break this down into smaller, manageable steps?`);
    followUps.push(`Should we look at some practice examples to reinforce this process?`);
  }
  
  if (lowerMessage.includes('why') || lowerMessage.includes('reason')) {
    followUps.push(`Would you like to explore the historical context behind this?`);
    followUps.push(`Are you curious about how this connects to other topics in ${subjectName}?`);
  }
  
  // Add preference-based follow-ups
  if (userProfile.preferences.includes('examples')) {
    followUps.push(`Would you like me to provide more specific examples?`);
  }
  
  if (userProfile.preferences.includes('visual')) {
    followUps.push(`Would a diagram or visual representation help clarify this concept?`);
  }
  
  return followUps.slice(0, 2); // Return max 2 follow-ups
}

// Extract main topic from user message
function extractMainTopic(message) {
  const keywords = extractKeywords(message);
  return keywords[0] || 'this topic';
}