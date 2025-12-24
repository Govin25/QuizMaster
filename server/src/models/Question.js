class Question {
    constructor(id, text, type, correctAnswer) {
        this.id = id;
        this.text = text;
        this.type = type;
        this.correctAnswer = correctAnswer;
    }

    validateAnswer(answer) {
        throw new Error("Method 'validateAnswer()' must be implemented.");
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            type: this.type,
            correctAnswer: this.correctAnswer
        };
    }
}

class MultipleChoiceQuestion extends Question {
    constructor(id, text, options, correctAnswer) {
        super(id, text, 'multiple_choice', correctAnswer);
        this.options = options; // Array of strings
    }

    validateAnswer(answer) {
        return this.correctAnswer === answer;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            options: this.options
        };
    }
}

class TrueFalseQuestion extends Question {
    constructor(id, text, correctAnswer) {
        super(id, text, 'true_false', correctAnswer);
    }

    validateAnswer(answer) {
        // answer expected to be boolean or string 'true'/'false'
        return String(this.correctAnswer).toLowerCase() === String(answer).toLowerCase();
    }
}

module.exports = { Question, MultipleChoiceQuestion, TrueFalseQuestion };
